"""
ADHD Prediction API Tests
"""



def test_prediction_success(client):
    """
    Test ADHD prediction API.

    Expected:
    - Status code = 200
    - Prediction result returned
    - Score exists
    - Probability exists
    - Top SHAP factors returned
    """

    answers = [
        3, 2, 4, 1, 2, 3,
        2, 1, 4, 3, 2, 1,
        2, 3, 4, 2, 1, 3
    ]

    response = client.post(
        '/detection/predict',
        json={
            'answers': answers,
            'user_id': 1
        }
    )

    data = response.get_json()

    assert response.status_code == 200

    # Verify prediction fields exist
    assert 'score' in data
    assert 'percentage' in data
    assert 'prediction' in data
    assert 'predicted_label' in data
    assert 'adhd_probability' in data
    assert 'top_factors' in data

    # Ensure top factors list exists
    assert isinstance(data['top_factors'], list)


def test_prediction_invalid_answers(client):
    """
    Test invalid answer array.

    Expected:
    - Status code = 400
    - Error returned
    """

    answers = [1, 2, 3]

    response = client.post(
        '/detection/predict',
        json={
            'answers': answers
        }
    )

    data = response.get_json()

    assert response.status_code == 400

    assert 'error' in data
