"""
Authentication API Tests
"""

import random



def test_register_success(client):
    """
    Test successful user registration.

    Expected:
    - Status code = 200
    - User object returned
    - Email should match
    """

    unique_email = f"test{random.randint(1,99999)}@gmail.com"

    payload = {
        "full_name": "Test User",
        "email": unique_email,
        "password": "123456"
    }

    response = client.post('/auth/register', json=payload)

    data = response.get_json()

    assert response.status_code == 200

    assert 'user' in data

    assert data['user']['email'] == unique_email


def test_register_duplicate_email(client):
    """
    Test duplicate email registration.

    Expected:
    - First registration succeeds
    - Second registration fails
    - Status code = 409
    """

    payload = {
        "full_name": "Duplicate User",
        "email": "duplicate@gmail.com",
        "password": "123456"
    }

    # First request
    client.post('/auth/register', json=payload)

    # Second request with same email
    response = client.post('/auth/register', json=payload)

    data = response.get_json()

    assert response.status_code == 409

    assert 'error' in data


def test_login_success(client):
    """
    Test successful login.

    Expected:
    - Status code = 200
    - User data returned
    """

    payload = {
        "full_name": "Login User",
        "email": "loginuser@gmail.com",
        "password": "123456"
    }

    # Register user first
    client.post('/auth/register', json=payload)

    # Try login
    login_payload = {
        "email": "loginuser@gmail.com",
        "password": "123456"
    }

    response = client.post('/auth/login', json=login_payload)

    data = response.get_json()

    assert response.status_code == 200

    assert 'user' in data

    assert data['user']['email'] == 'loginuser@gmail.com'
