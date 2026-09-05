import pytest


def test_analytics_endpoints(client, admin_auth_headers, teacher_auth_headers, student_auth_headers):
    # Admin dashboard summary stats
    resp_admin = client.get("/api/analytics/dashboard", headers=admin_auth_headers)
    assert resp_admin.status_code == 200

    # Attendance trend for teachers/admin (Exponential Smoothing)
    resp_trend = client.get("/api/analytics/attendance-trend", headers=teacher_auth_headers)
    assert resp_trend.status_code == 200

    # Subject performance
    resp_subject = client.get("/api/analytics/subject-performance", headers=teacher_auth_headers)
    assert resp_subject.status_code == 200


def test_predictive_analytics_models(client, admin_auth_headers):
    # 1. Academic Dropout Risk Prediction Model
    resp_risk = client.get("/api/analytics/predict/dropout-risk", headers=admin_auth_headers)
    assert resp_risk.status_code == 200
    data_risk = resp_risk.json()
    assert "model" in data_risk
    assert "at_risk_students" in data_risk
    assert "high_risk_count" in data_risk

    # 2. Fee Revenue & Collection Forecast Model
    resp_fee = client.get("/api/analytics/predict/fee-forecast", headers=admin_auth_headers)
    assert resp_fee.status_code == 200
    data_fee = resp_fee.json()
    assert "projected_next_month_collection" in data_fee
    assert "confidence_level" in data_fee
    assert data_fee["confidence_level"] > 0.8

    # 3. Placement Readiness Model
    resp_placement = client.get("/api/analytics/predict/placement-readiness/1", headers=admin_auth_headers)
    assert resp_placement.status_code == 200
    data_placement = resp_placement.json()
    assert "placement_probability_index" in data_placement
    assert "readiness_status" in data_placement


def test_ml_performance_and_grade_prediction(client, admin_auth_headers):
    # ML Performance Prediction (RandomForest)
    resp_perf = client.get("/api/ai/performance-prediction/1", headers=admin_auth_headers)
    assert resp_perf.status_code == 200
    data_perf = resp_perf.json()
    assert "prediction" in data_perf

    # ML Grade Prediction (Linear Regression)
    resp_grade = client.get("/api/ai/grade-prediction/1", headers=admin_auth_headers)
    assert resp_grade.status_code == 200
    data_grade = resp_grade.json()
    assert "predicted_grade" in data_grade
    assert "predicted_marks" in data_grade
