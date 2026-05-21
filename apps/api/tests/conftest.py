import pytest
import sys
import os

# Add the app directory to the path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from fastapi.testclient import TestClient
from main import app


@pytest.fixture
def client():
    """Create a test client for the FastAPI app."""
    return TestClient(app)


@pytest.fixture
def base_url():
    """Base URL for API endpoints."""
    return "/api/v1"


@pytest.fixture
def sample_supplier():
    """Sample supplier data for testing."""
    return {
        "id": "sup_001",
        "name": "Test Supplier",
        "contact_name": "John Doe",
        "contact_phone": "+86-138-0000-0000",
        "contact_email": "test@supplier.com",
        "quality_score": 85.5,
        "is_active": True,
    }


@pytest.fixture
def sample_quote():
    """Sample quote data for testing."""
    return {
        "id": "quote_001",
        "supplier_id": "sup_001",
        "product_name": "Test Product",
        "price": 99.99,
        "currency": "CNY",
        "quality_score": 80.0,
        "status": "pending",
        "created_at": "2026-05-21T10:00:00Z",
    }


@pytest.fixture
def sample_account():
    """Sample account data for testing."""
    return {
        "id": "acc_001",
        "supplier_id": "sup_001",
        "supplier_name": "Test Supplier",
        "contact_name": "John Doe",
        "contact_phone": "+86-138-0000-0000",
        "contact_email": "test@supplier.com",
        "account_status": "active",
        "quality_score": 85.5,
        "total_quotes": 100,
        "pending_quotes": 5,
        "approved_quotes": 90,
        "rejected_quotes": 5,
    }


@pytest.fixture
def sample_log_entry():
    """Sample log entry data for testing."""
    return {
        "id": "log_001",
        "timestamp": "2026-05-21T10:00:00Z",
        "level": "info",
        "module": "api",
        "action": "create_quote",
        "user_id": "user_001",
        "user_name": "Test User",
        "details": "Quote created successfully",
        "ip_address": "192.168.1.1",
        "duration_ms": 150,
        "status_code": 201,
    }


@pytest.fixture
def sample_pipeline_task():
    """Sample pipeline task data for testing."""
    return {
        "id": "task_001",
        "name": "Quote Sync Task",
        "description": "Synchronize quotes from suppliers",
        "type": "sync",
        "status": "running",
        "schedule": "*/5 * * * *",
        "last_run_at": "2026-05-21T09:55:00Z",
        "next_run_at": "2026-05-21T10:00:00Z",
        "duration_ms": 30000,
        "progress": 65,
        "records_processed": 1500,
    }
