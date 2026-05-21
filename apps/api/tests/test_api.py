"""
API endpoint tests for VC 2.0 API.
"""
import pytest


class TestSupplierEndpoints:
    """Test suite for supplier endpoints."""

    def test_get_suppliers_returns_empty_list(self, client):
        """Test that GET /suppliers returns empty list."""
        response = client.get("/suppliers")
        assert response.status_code == 200
        data = response.json()
        assert "suppliers" in data
        assert isinstance(data["suppliers"], list)

    def test_get_suppliers_returns_json(self, client):
        """Test that GET /suppliers returns JSON content type."""
        response = client.get("/suppliers")
        assert response.status_code == 200
        assert "application/json" in response.headers["content-type"]

    def test_post_suppliers_returns_not_implemented(self, client):
        """Test that POST /suppliers returns not implemented message."""
        response = client.post("/suppliers")
        assert response.status_code == 200
        data = response.json()
        assert data["message"] == "not implemented"


class TestSkuEndpoints:
    """Test suite for SKU endpoints."""

    def test_get_skus_returns_empty_list(self, client):
        """Test that GET /skus returns empty list."""
        response = client.get("/skus")
        assert response.status_code == 200
        data = response.json()
        assert "skus" in data
        assert isinstance(data["skus"], list)

    def test_post_skus_returns_not_implemented(self, client):
        """Test that POST /skus returns not implemented message."""
        response = client.post("/skus")
        assert response.status_code == 200
        data = response.json()
        assert data["message"] == "not implemented"


class TestQuoteEndpoints:
    """Test suite for quote endpoints."""

    def test_get_quotes_returns_empty_list(self, client):
        """Test that GET /quotes returns empty list."""
        response = client.get("/quotes")
        assert response.status_code == 200
        data = response.json()
        assert "quotes" in data
        assert isinstance(data["quotes"], list)

    def test_post_quotes_returns_not_implemented(self, client):
        """Test that POST /quotes returns not implemented message."""
        response = client.post("/quotes")
        assert response.status_code == 200
        data = response.json()
        assert data["message"] == "not implemented"
