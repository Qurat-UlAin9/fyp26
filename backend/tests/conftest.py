import pytest
from app import app, bootstrap_database, train_or_load_model


@pytest.fixture
def client():

    # Initialize DB + model before tests
    bootstrap_database()
    train_or_load_model()

    app.config['TESTING'] = True

    with app.test_client() as client:
        yield client