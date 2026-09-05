import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_health_probes():
    """Verify both /health and /api/health return valid healthy statuses with uptime & metadata."""
    for path in ("/health", "/api/health"):
        res = client.get(path)
        assert res.status_code == 200
        data = res.json()
        assert data["status"] in ("healthy", "degraded")
        assert "database" in data
        assert "uptime_seconds" in data
        assert "version" in data
        assert "environment" in data
        assert "timestamp" in data


def test_security_headers_and_request_id():
    """Verify production security headers and correlation request IDs."""
    res = client.get("/")
    assert res.status_code == 200
    headers = res.headers

    # Check security headers
    assert headers.get("x-content-type-options") == "nosniff"
    assert headers.get("x-frame-options") == "DENY"
    assert headers.get("x-xss-protection") == "1; mode=block"
    assert headers.get("referrer-policy") == "strict-origin-when-cross-origin"
    assert "x-process-time-ms" in headers
    assert "x-request-id" in headers
    assert len(headers["x-request-id"]) > 0


def test_custom_request_id_propagation():
    """Verify custom X-Request-ID from client is preserved."""
    custom_id = "test-correlation-id-998877"
    res = client.get("/health", headers={"X-Request-ID": custom_id})
    assert res.status_code == 200
    assert res.headers.get("x-request-id") == custom_id


def test_root_endpoint_metadata():
    """Verify root endpoint provides API details."""
    res = client.get("/")
    assert res.status_code == 200
    data = res.json()
    assert "name" in data
    assert "version" in data
    assert "status" in data
    assert data["status"] == "running"
