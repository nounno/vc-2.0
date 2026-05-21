"""
Health check endpoint tests for VC 2.0 API.
"""
import pytest


class TestHealthEndpoints:
    """Test suite for health check endpoints."""

    def test_health_endpoint_returns_ok(self, client):
        """Test that /health returns status ok."""
        response = client.get("/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "ok"
        assert data["service"] == "api"

    def test_api_v1_health_endpoint(self, client):
        """Test that /api/v1/health returns ok."""
        response = client.get("/api/v1/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "ok"

    def test_health_response_headers(self, client):
        """Test that health endpoint returns proper JSON headers."""
        response = client.get("/health")
        assert response.status_code == 200
        assert "application/json" in response.headers["content-type"]

    def test_health_endpoint_no_auth_required(self, client):
        """Test that health endpoint does not require authentication."""
        response = client.get("/health")
        assert response.status_code == 200
