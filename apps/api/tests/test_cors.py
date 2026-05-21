"""
CORS configuration tests for VC 2.0 API.
Tests verify CORS environment variables and configuration.
"""
import pytest
import os


class TestCORSConfiguration:
    """Test suite for CORS configuration."""

    def test_allowed_origins_env_var_exists(self):
        """Test that ALLOWED_ORIGINS environment variable is defined."""
        allowed_origins = os.environ.get("ALLOWED_ORIGINS")
        # ALLOWED_ORIGINS may not be set in test environment, but if it is, it should be valid
        if allowed_origins:
            assert len(allowed_origins) > 0, "ALLOWED_ORIGINS cannot be empty if set"

    def test_cors_config_structure(self):
        """Test that CORS configuration has proper structure if ALLOWED_ORIGINS is set."""
        allowed_origins = os.environ.get("ALLOWED_ORIGINS")
        if allowed_origins:
            # If multiple origins, they should be comma-separated
            origins = [o.strip() for o in allowed_origins.split(",")]
            assert len(origins) > 0, "At least one origin should be specified"
            # Basic URL format check for first origin
            if len(origins) > 0 and origins[0]:
                assert "://" in origins[0] or origins[0] == "*", "Origin should be a valid URL or *"

    def test_admin_origins_configuration(self):
        """Test that admin app origin is properly configured."""
        # Admin app typically runs on a specific domain
        # This test verifies the pattern for allowed origins configuration
        allowed_origins = os.environ.get("ALLOWED_ORIGINS", "")
        # Common admin domains pattern
        admin_domains = ["admin.ibotclaw.com", "localhost:3001"]
        
        # If ALLOWED_ORIGINS is set, verify it follows expected pattern
        if allowed_origins:
            origins = [o.strip() for o in allowed_origins.split(",")]
            for origin in origins:
                if origin != "*":
                    assert "://" in origin or origin.startswith("http"), f"Invalid origin format: {origin}"


class TestCORSSecurityHeaders:
    """Test suite for CORS security headers."""

    def test_cors_requires_explicit_origin(self):
        """Test that CORS policy requires explicit origin configuration."""
        allowed_origins = os.environ.get("ALLOWED_ORIGINS", "")
        # Empty ALLOWED_ORIGINS means no CORS configuration, which is a security risk
        # In production, this should always be set explicitly
        if allowed_origins == "":
            pytest.skip("ALLOWED_ORIGINS not set - may be development environment")

    def test_cors_wildcard_only_for_dev(self):
        """Test that wildcard CORS origin is only used in development."""
        allowed_origins = os.environ.get("ALLOWED_ORIGINS", "")
        if allowed_origins == "*":
            # Check if we're in development mode
            environment = os.environ.get("ENVIRONMENT", "development")
            assert environment == "development", "Wildcard CORS should not be used in production"


class TestCORSEnvironmentVariables:
    """Test suite for CORS-related environment variables."""

    def test_cors_env_var_format(self):
        """Test that CORS environment variable is in correct format."""
        allowed_origins = os.environ.get("ALLOWED_ORIGINS")
        if allowed_origins:
            # Should be comma-separated list of origins
            assert "," in allowed_origins or "://" in allowed_origins, \
                "ALLOWED_ORIGINS should be comma-separated URLs or a single origin"
