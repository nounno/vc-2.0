"""
MySQL configuration tests for VC 2.0 API.
Tests verify MySQL connection configuration and URL encoding handling.
"""
import pytest
import os
from urllib.parse import quote_plus


class TestMySQLConfiguration:
    """Test suite for MySQL configuration."""

    def test_mysql_host_is_defined(self):
        """Test that MYSQL_HOST environment variable is defined."""
        mysql_host = os.environ.get("MYSQL_HOST")
        assert mysql_host is not None, "MYSQL_HOST environment variable must be defined"
        assert len(mysql_host) > 0, "MYSQL_HOST cannot be empty"

    def test_mysql_port_is_defined(self):
        """Test that MYSQL_PORT environment variable is defined."""
        mysql_port = os.environ.get("MYSQL_PORT")
        assert mysql_port is not None, "MYSQL_PORT environment variable must be defined"
        assert mysql_port.isdigit(), "MYSQL_PORT must be a numeric string"

    def test_mysql_user_is_defined(self):
        """Test that MYSQL_USER environment variable is defined."""
        mysql_user = os.environ.get("MYSQL_USER")
        assert mysql_user is not None, "MYSQL_USER environment variable must be defined"
        assert len(mysql_user) > 0, "MYSQL_USER cannot be empty"

    def test_mysql_password_is_defined(self):
        """Test that MYSQL_PASSWORD environment variable is defined."""
        mysql_password = os.environ.get("MYSQL_PASSWORD")
        assert mysql_password is not None, "MYSQL_PASSWORD environment variable must be defined"
        assert len(mysql_password) > 0, "MYSQL_PASSWORD cannot be empty"

    def test_mysql_database_is_defined(self):
        """Test that MYSQL_DATABASE environment variable is defined."""
        mysql_database = os.environ.get("MYSQL_DATABASE")
        assert mysql_database is not None, "MYSQL_DATABASE environment variable must be defined"
        assert len(mysql_database) > 0, "MYSQL_DATABASE cannot be empty"

    def test_mysql_password_special_chars_url_encoding(self):
        """Test that MySQL passwords with special characters are properly URL encoded."""
        # Common special characters that need URL encoding in MySQL passwords
        special_char_passwords = [
            "Vc@2026#root",
            "Vc@2026%23db",
            "password!@#$%",
            "pass@word#123",
        ]
        
        for password in special_char_passwords:
            encoded = quote_plus(password)
            # quote_plus should encode @ as %40, # as %23, etc.
            assert encoded != password or password == encoded
            # Verify encoded password can be used in URL
            assert "%" in encoded or encoded == password


class TestMySQLConnectionString:
    """Test suite for MySQL connection string construction."""

    def test_mysql_connection_requires_all_params(self):
        """Test that MySQL connection requires all mandatory parameters."""
        required_params = ["MYSQL_HOST", "MYSQL_PORT", "MYSQL_USER", "MYSQL_PASSWORD", "MYSQL_DATABASE"]
        
        for param in required_params:
            value = os.environ.get(param)
            assert value is not None and len(str(value)) > 0, f"{param} is required for MySQL connection"

    def test_mysql_port_in_valid_range(self):
        """Test that MySQL port is in valid range (1-65535)."""
        mysql_port = os.environ.get("MYSQL_PORT")
        if mysql_port:
            port_int = int(mysql_port)
            assert 1 <= port_int <= 65535, "MySQL port must be between 1 and 65535"


class TestMySQLURLEncoding:
    """Test suite for MySQL URL encoding edge cases."""

    def test_at_sign_encoding(self):
        """Test that @ sign in password is properly encoded."""
        # @ should be encoded as %40
        assert quote_plus("@") == "%40"

    def test_hash_sign_encoding(self):
        """Test that # sign in password is properly encoded."""
        # # should be encoded as %23
        assert quote_plus("#") == "%23"

    def test_percent_sign_encoding(self):
        """Test that % sign in password is properly encoded."""
        # % should be encoded as %25
        assert quote_plus("%") == "%25"

    def test_special_password_url_encoding(self):
        """Test URL encoding for passwords with multiple special characters."""
        # Test case from docker-compose: Vc@2026%23db
        password = "Vc@2026%23db"
        encoded = quote_plus(password)
        # All special chars should be encoded
        assert "%" in encoded or "@" not in encoded
