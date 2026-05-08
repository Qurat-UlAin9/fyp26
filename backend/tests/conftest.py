import pytest
from app import app


@pytest.fixture
def client():
    """
    Creates Flask test client.

    This allows us to simulate API requests
    without running the real server.
    """
     app.config['TESTING'] = True

    with app.test_client() as client:
        yield client