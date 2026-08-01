"""
ml_service.py — Machine-learning models for the Student Management System.

Models are trained on synthetic data at import time. In production, train on
real historical outcomes and persist with joblib.

Models:
  1. Random Forest Classifier  — Performance label (Excellent/Good/Average/Weak)
  2. Linear Regression         — Predicted final exam marks
  3. K-Means Clustering        — Group students by academic profile
  4. Exponential Smoothing     — Attendance trend forecasting (ETS)
"""
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.linear_model import LinearRegression
from sklearn.cluster import KMeans
from sklearn.preprocessing import StandardScaler
from sklearn.model_selection import cross_val_score

# ── Reproducibility ─────────────────────────────────────────────────────────────
np.random.seed(42)

# ── Synthetic training dataset (2 000 students) ─────────────────────────────────
# Features have realistic correlations: students who attend more tend to score higher.
_N = 2000
_att   = np.random.normal(72, 18, _N).clip(0, 100)
_marks = (np.random.normal(58, 22, _N) + 0.35 * (_att - 72)).clip(0, 100)
_asgn  = (np.random.normal(68, 18, _N) + 0.20 * (_marks - 58)).clip(0, 100)

_composite = 0.40 * _att + 0.40 * _marks + 0.20 * _asgn
_LABELS = np.where(_composite >= 82, "Excellent",
          np.where(_composite >= 65, "Good",
          np.where(_composite >= 48, "Average", "Weak")))

_X = np.column_stack([_att, _marks, _asgn])

# ── Model 1: Random Forest ───────────────────────────────────────────────────────
_rf = RandomForestClassifier(n_estimators=150, max_depth=10, random_state=42, n_jobs=-1)
_rf.fit(_X, _LABELS)
_RF_CV_ACCURACY = round(float(cross_val_score(_rf, _X, _LABELS, cv=5).mean()), 4)

FEATURE_NAMES = ["attendance_pct", "avg_marks", "assignment_pct"]
_rf_importance = {
    name: round(float(val), 4)
    for name, val in zip(FEATURE_NAMES, _rf.feature_importances_)
}

# ── Model 2: Linear Regression ──────────────────────────────────────────────────
_final = (0.38 * _att + 0.42 * _marks + 0.20 * _asgn
          + np.random.normal(0, 4, _N)).clip(0, 100)
_lr = LinearRegression()
_lr.fit(_X, _final)
_LR_RESIDUAL_STD = float(np.std(_final - _lr.predict(_X)))


# ── Public API ──────────────────────────────────────────────────────────────────

def predict_performance_ml(
    attendance_pct: float,
    avg_marks: float,
    assignment_pct: float,
) -> dict:
    """
    Random Forest classifier — predicts Excellent / Good / Average / Weak.

    Returns prediction, confidence %, per-class probabilities, and
    which features matter most (feature importance).
    """
    X = np.array([[attendance_pct, avg_marks, assignment_pct]])
    prediction = str(_rf.predict(X)[0])
    probas     = _rf.predict_proba(X)[0]
    classes    = list(_rf.classes_)
    confidence = round(float(max(probas)) * 100, 1)
    proba_dict = {c: round(float(p) * 100, 1) for c, p in zip(classes, probas)}

    risk_map = {"Weak": "high", "Average": "medium", "Good": "low", "Excellent": "low"}
    return {
        "prediction": prediction,
        "confidence": confidence,
        "risk_level": risk_map.get(prediction, "medium"),
        "probabilities": proba_dict,
        "feature_importance": _rf_importance,
        "model": "RandomForest",
        "model_cv_accuracy": _RF_CV_ACCURACY,
    }


def predict_grade_lr(
    attendance_pct: float,
    avg_marks: float,
    assignment_pct: float,
) -> dict:
    """
    Linear Regression — predicts final exam marks from current academic stats.
    Returns predicted marks, letter grade, and a 95% confidence interval.
    """
    X = np.array([[attendance_pct, avg_marks, assignment_pct]])
    predicted = float(np.clip(_lr.predict(X)[0], 0.0, 100.0))

    if predicted >= 90:   grade = "A+"
    elif predicted >= 80: grade = "A"
    elif predicted >= 70: grade = "B"
    elif predicted >= 60: grade = "C"
    elif predicted >= 40: grade = "D"
    else:                 grade = "F"

    margin = 1.96 * _LR_RESIDUAL_STD
    return {
        "predicted_marks": round(predicted, 2),
        "predicted_grade": grade,
        "confidence_interval": {
            "lower": round(max(0.0, predicted - margin), 2),
            "upper": round(min(100.0, predicted + margin), 2),
        },
        "model": "LinearRegression",
    }


def cluster_students(student_features: list[dict], n_clusters: int = 3) -> dict:
    """
    K-Means clustering of students by academic profile.

    Input:  list of dicts with keys: student_id, student_name,
            attendance_pct, avg_marks, assignment_pct
    Output: clusters dict with per-cluster stats and student lists.
    """
    n = len(student_features)
    if n < 2:
        return {"clusters": [], "n_clusters": 0, "model": "KMeans"}

    k = min(n_clusters, n)
    X = np.array([
        [s["attendance_pct"], s["avg_marks"], s["assignment_pct"]]
        for s in student_features
    ], dtype=float)

    scaler = StandardScaler()
    X_sc   = scaler.fit_transform(X)
    km     = KMeans(n_clusters=k, random_state=42, n_init=10)
    labels = km.fit_predict(X_sc)

    # Map cluster indices → human-readable names (ranked by composite score)
    centroids   = scaler.inverse_transform(km.cluster_centers_)
    scores      = [0.4 * c[0] + 0.4 * c[1] + 0.2 * c[2] for c in centroids]
    rank_order  = np.argsort(scores)[::-1]
    _names = ["High Achievers", "Average Performers", "At-Risk Students",
              "Group 4", "Group 5"]
    name_map = {int(old_idx): _names[rank] for rank, old_idx in enumerate(rank_order)}

    clusters: dict[str, dict] = {}
    for feat, label in zip(student_features, labels.tolist()):
        cname = name_map[label]
        if cname not in clusters:
            c = centroids[label]
            clusters[cname] = {
                "name": cname,
                "avg_attendance":  round(float(c[0]), 1),
                "avg_marks":       round(float(c[1]), 1),
                "avg_assignments": round(float(c[2]), 1),
                "students": [],
            }
        clusters[cname]["students"].append({
            "student_id":    feat["student_id"],
            "student_name":  feat["student_name"],
            "attendance_pct":  feat["attendance_pct"],
            "avg_marks":       feat["avg_marks"],
            "assignment_pct":  feat["assignment_pct"],
        })

    return {"clusters": list(clusters.values()), "n_clusters": k, "model": "KMeans"}


def forecast_attendance_trend(daily_data: list[dict], days_ahead: int = 7) -> dict:
    """
    Exponential Smoothing (ETS/EWM) forecast on daily attendance percentage.

    daily_data: list of {"date": "YYYY-MM-DD", "total": int, "present": int}
    Returns:
      - historical: actual % + smoothed %
      - forecast: predicted % for next `days_ahead` days
      - trend_per_day: daily slope (positive = improving)
    """
    if len(daily_data) < 5:
        return {"historical": [], "forecast": [], "model": "ExponentialSmoothing",
                "error": "Not enough data (need >= 5 days)"}

    df = pd.DataFrame(daily_data)
    df["date"]  = pd.to_datetime(df["date"])
    df          = df.sort_values("date").reset_index(drop=True)
    df["total"] = df["total"].replace(0, np.nan)
    df["pct"]   = (df["present"] / df["total"] * 100).fillna(0).clip(0, 100)

    smoothed = df["pct"].ewm(alpha=0.3, adjust=False).mean()

    # Linear trend from last 14 smoothed observations
    window = smoothed.tail(min(14, len(smoothed))).values
    trend  = float(np.polyfit(range(len(window)), window, 1)[0])
    last_v = float(smoothed.iloc[-1])
    last_d = df["date"].iloc[-1]

    historical = [
        {
            "date": str(row.date.date()),
            "actual_pct":   round(row.pct, 2),
            "smoothed_pct": round(float(smoothed.iloc[i]), 2),
        }
        for i, row in df.iterrows()
    ]

    forecast = [
        {
            "date": str((last_d + pd.Timedelta(days=i)).date()),
            "predicted_attendance_pct": round(
                max(0.0, min(100.0, last_v + trend * i)), 2
            ),
        }
        for i in range(1, days_ahead + 1)
    ]

    return {
        "historical": historical,
        "forecast": forecast,
        "trend_per_day": round(trend, 4),
        "model": "ExponentialSmoothing",
    }
