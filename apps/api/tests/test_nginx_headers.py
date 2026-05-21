"""
Nginx security headers tests for VC 2.0.
Tests verify that nginx configuration includes proper security headers.
"""
import pytest
import os


class TestNginxSecurityHeaders:
    """Test suite for nginx security headers configuration."""

    def test_x_frame_options_header_configured(self):
        """Test that X-Frame-Options header is configured in nginx."""
        # This test verifies the admin.conf has X-Frame-Options configured
        nginx_conf_path = os.path.join(os.path.dirname(__file__), "..", "..", "..", "docker", "conf.d", "admin.conf")
        if os.path.exists(nginx_conf_path):
            with open(nginx_conf_path, "r") as f:
                content = f.read()
            assert "X-Frame-Options" in content, "X-Frame-Options header should be configured"
            assert "SAMEORIGIN" in content, "X-Frame-Options should be set to SAMEORIGIN"

    def test_x_content_type_options_header_configured(self):
        """Test that X-Content-Type-Options header is configured."""
        nginx_conf_path = os.path.join(os.path.dirname(__file__), "..", "..", "..", "docker", "conf.d", "admin.conf")
        if os.path.exists(nginx_conf_path):
            with open(nginx_conf_path, "r") as f:
                content = f.read()
            assert "X-Content-Type-Options" in content, "X-Content-Type-Options header should be configured"
            assert "nosniff" in content, "X-Content-Type-Options should be set to nosniff"

    def test_x_xss_protection_header_configured(self):
        """Test that X-XSS-Protection header is configured."""
        nginx_conf_path = os.path.join(os.path.dirname(__file__), "..", "..", "..", "docker", "conf.d", "admin.conf")
        if os.path.exists(nginx_conf_path):
            with open(nginx_conf_path, "r") as f:
                content = f.read()
            assert "X-XSS-Protection" in content, "X-XSS-Protection header should be configured"

    def test_referrer_policy_header_configured(self):
        """Test that Referrer-Policy header is configured."""
        nginx_conf_path = os.path.join(os.path.dirname(__file__), "..", "..", "..", "docker", "conf.d", "admin.conf")
        if os.path.exists(nginx_conf_path):
            with open(nginx_conf_path, "r") as f:
                content = f.read()
            assert "Referrer-Policy" in content, "Referrer-Policy header should be configured"

    def test_content_security_policy_header_configured(self):
        """Test that Content-Security-Policy header is configured."""
        nginx_conf_path = os.path.join(os.path.dirname(__file__), "..", "..", "..", "docker", "conf.d", "admin.conf")
        if os.path.exists(nginx_conf_path):
            with open(nginx_conf_path, "r") as f:
                content = f.read()
            assert "Content-Security-Policy" in content, "Content-Security-Policy header should be configured"

    def test_permissions_policy_header_configured(self):
        """Test that Permissions-Policy header is configured."""
        nginx_conf_path = os.path.join(os.path.dirname(__file__), "..", "..", "..", "docker", "conf.d", "admin.conf")
        if os.path.exists(nginx_conf_path):
            with open(nginx_conf_path, "r") as f:
                content = f.read()
            assert "Permissions-Policy" in content, "Permissions-Policy header should be configured"

    def test_security_headers_use_always_directive(self):
        """Test that security headers use 'always' directive for nginx."""
        nginx_conf_path = os.path.join(os.path.dirname(__file__), "..", "..", "..", "docker", "conf.d", "admin.conf")
        if os.path.exists(nginx_conf_path):
            with open(nginx_conf_path, "r") as f:
                content = f.read()
            assert 'add_header' in content, "add_header directive should be used"
            # Check that headers are added with 'always' suffix for nginx 1.7.5+
            assert 'always;' in content or 'always\n' in content, "Headers should use 'always' directive"


class TestNginxProxyConfiguration:
    """Test suite for nginx proxy configuration."""

    def test_nginx_proxy_pass_for_api_v1(self):
        """Test that nginx proxy passes /api/v1/ to datacenter service."""
        nginx_conf_path = os.path.join(os.path.dirname(__file__), "..", "..", "..", "docker", "conf.d", "admin.conf")
        if os.path.exists(nginx_conf_path):
            with open(nginx_conf_path, "r") as f:
                content = f.read()
            assert "/api/v1/" in content, "nginx should have location for /api/v1/"
            assert "proxy_pass" in content, "proxy_pass directive should be configured"

    def test_nginx_admin_location_configured(self):
        """Test that admin location is properly configured."""
        nginx_conf_path = os.path.join(os.path.dirname(__file__), "..", "..", "..", "docker", "conf.d", "admin.conf")
        if os.path.exists(nginx_conf_path):
            with open(nginx_conf_path, "r") as f:
                content = f.read()
            # Should have location / for admin app
            assert 'location /' in content or 'location / {' in content, "Admin location should be configured"

    def test_nginx_upstream_headers_forwarded(self):
        """Test that nginx properly forwards headers to upstream."""
        nginx_conf_path = os.path.join(os.path.dirname(__file__), "..", "..", "..", "docker", "conf.d", "admin.conf")
        if os.path.exists(nginx_conf_path):
            with open(nginx_conf_path, "r") as f:
                content = f.read()
            required_headers = ["X-Real-IP", "X-Forwarded-For", "X-Forwarded-Proto", "Host"]
            for header in required_headers:
                assert header in content, f"{header} header should be forwarded to upstream"
