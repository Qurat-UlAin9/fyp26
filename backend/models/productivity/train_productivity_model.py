"""
Student Productivity Model Training - XGBoost
FYP26 Project
Dataset: 2000 student records with distraction factors
"""

import pandas as pd
import numpy as np
import pickle
import json
import os
from pathlib import Path
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.metrics import mean_squared_error, mean_absolute_error, r2_score
from xgboost import XGBRegressor
import warnings

warnings.filterwarnings('ignore')

# ============================================================================
# STEP 1: DATA LOADING & PREPROCESSING
# ============================================================================

print("\n" + "="*80)
print(" STEP 1: DATA LOADING & PREPROCESSING")
print("="*80)

try:
    # Load CSV file
    csv_file = 'data/student_productivity_distraction_dataset.csv'
    df = pd.read_csv(csv_file)
    
    print(f"\n Dataset loaded successfully!")
    print(f"    File: {csv_file}")
    print(f"    Total Records: {len(df)}")
    print(f"    Total Columns: {len(df.columns)}")
    print(f"\n   Columns: {list(df.columns)}")
    
except FileNotFoundError:
    print(f"\n ERROR: File not found - {csv_file}")
    print(f"   Make sure the file exists in the 'data' folder")
    exit(1)
except Exception as e:
    print(f"\n ERROR loading file: {str(e)}")
    exit(1)

# Check data shape
print(f"\n Dataset Shape: {df.shape}")
print(f"   Memory: {df.memory_usage(deep=True).sum() / 1024:.2f} KB")

# Display first few rows
print(f"\n First 3 rows:")
print(df.head(3).to_string())

# Check for missing values
print(f"\n Missing Values Check:")
missing_total = df.isnull().sum().sum()
if missing_total > 0:
    print(f"    Found {missing_total} missing values")
    missing_cols = df.isnull().sum()
    print(f"   Missing per column:")
    print(missing_cols[missing_cols > 0])
    df = df.fillna(df.mean(numeric_only=True))
    print(f"    Filled with mean values")
else:
    print(f"    No missing values - Dataset is clean!")

# Encode categorical variables
print(f"\n Encoding Categorical Variables:")
label_encoders = {}

if 'gender' in df.columns:
    le = LabelEncoder()
    original_gender = df['gender'].unique()
    df['gender'] = le.fit_transform(df['gender'])
    label_encoders['gender'] = le
    encoding_map = dict(zip(le.classes_, le.transform(le.classes_)))
    print(f"    Gender Encoded:")
    for key, val in encoding_map.items():
        print(f"      {key} → {val}")

# Remove student_id (not needed for prediction)
if 'student_id' in df.columns:
    print(f"    Removed student_id column")
    df = df.drop('student_id', axis=1)

# Separate features and target
feature_columns = [col for col in df.columns if col != 'productivity_score']
X = df[feature_columns]
y = df['productivity_score']

print(f"\n Dataset Statistics:")
print(f"    Features: {len(feature_columns)}")
print(f"    Target Variable (productivity_score):")
print(f"      • Minimum: {y.min():.2f}")
print(f"      • Maximum: {y.max():.2f}")
print(f"      • Mean: {y.mean():.2f}")
print(f"      • Median: {y.median():.2f}")
print(f"      • Std Dev: {y.std():.2f}")

# ============================================================================
# STEP 2: TRAIN-TEST SPLIT
# ============================================================================

print("\n" + "="*80)
print(" STEP 2: TRAIN-TEST SPLIT")
print("="*80)

X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42
)

print(f"\n Data Split Complete:")
print(f"   Training Set: {len(X_train)} samples (80%)")
print(f"   Test Set: {len(X_test)} samples (20%)")
print(f"   Features per sample: {X_train.shape[1]}")

# ============================================================================
# STEP 3: FEATURE SCALING
# ============================================================================

print("\n" + "="*80)
print(" STEP 3: FEATURE SCALING")
print("="*80)

scaler = StandardScaler()
X_train_scaled = scaler.fit_transform(X_train)
X_test_scaled = scaler.transform(X_test)

print(f"\n StandardScaler applied successfully!")
print(f"   Scaled {X_train_scaled.shape[1]} features")
print(f"   Mean of scaled features: {X_train_scaled.mean():.6f}")
print(f"   Std of scaled features: {X_train_scaled.std():.6f}")

# ============================================================================
# STEP 4: MODEL TRAINING
# ============================================================================

print("\n" + "="*80)
print(" STEP 4: XGBOOST MODEL TRAINING")
print("="*80)

print(f"\n Model Configuration:")
print(f"   • Algorithm: XGBoost Regressor")
print(f"   • n_estimators: 200")
print(f"   • max_depth: 7")
print(f"   • learning_rate: 0.05")
print(f"   • subsample: 0.8")
print(f"   • colsample_bytree: 0.8")
print(f"   • objective: reg:squarederror")

print(f"\n Training in progress...")

model = XGBRegressor(
    n_estimators=200,
    max_depth=7,
    learning_rate=0.05,
    subsample=0.8,
    colsample_bytree=0.8,
    objective='reg:squarederror',
    random_state=42,
    n_jobs=-1,
    verbose=0
)

model.fit(
    X_train_scaled, y_train,
    verbose=False
)

print(f" Training completed!")
print(f"   Total boosting rounds: {model.n_estimators}")

# ============================================================================
# STEP 5: MODEL EVALUATION
# ============================================================================

print("\n" + "="*80)
print(" STEP 5: MODEL EVALUATION & METRICS")
print("="*80)

# Predictions
y_pred_train = model.predict(X_train_scaled)
y_pred_test = model.predict(X_test_scaled)

# Training metrics
train_rmse = np.sqrt(mean_squared_error(y_train, y_pred_train))
train_mae = mean_absolute_error(y_train, y_pred_train)
train_r2 = r2_score(y_train, y_pred_train)

# Test metrics
test_rmse = np.sqrt(mean_squared_error(y_test, y_pred_test))
test_mae = mean_absolute_error(y_test, y_pred_test)
test_r2 = r2_score(y_test, y_pred_test)

print(f"\n TRAINING SET METRICS:")
print(f"   • RMSE (Root Mean Squared Error): {train_rmse:.4f}")
print(f"   • MAE (Mean Absolute Error):     {train_mae:.4f}")
print(f"   • R² (R-Squared Score):          {train_r2:.4f}")

print(f"\n TEST SET METRICS:")
print(f"   • RMSE (Root Mean Squared Error): {test_rmse:.4f}")
print(f"   • MAE (Mean Absolute Error):     {test_mae:.4f}")
print(f"   • R² (R-Squared Score):          {test_r2:.4f}")

# Model quality assessment
print(f"\n MODEL QUALITY ASSESSMENT:")
if test_r2 >= 0.85:
    quality = "EXCELLENT ⭐⭐⭐⭐⭐"
elif test_r2 >= 0.75:
    quality = "VERY GOOD ⭐⭐⭐⭐"
elif test_r2 >= 0.65:
    quality = "GOOD ⭐⭐⭐"
elif test_r2 >= 0.55:
    quality = "ACCEPTABLE ⭐⭐"
else:
    quality = "NEEDS IMPROVEMENT ⭐"

print(f"   Rating: {quality}")
print(f"   R² Score: {test_r2:.4f} (explains {test_r2*100:.2f}% of variance)")
print(f"   Avg Prediction Error: ±{test_mae:.2f} points")

# ============================================================================
# STEP 6: FEATURE IMPORTANCE ANALYSIS
# ============================================================================

print("\n" + "="*80)
print(" STEP 6: FEATURE IMPORTANCE ANALYSIS")
print("="*80)

feature_importance = pd.DataFrame({
    'feature': feature_columns,
    'importance': model.feature_importances_
}).sort_values('importance', ascending=False)

feature_importance_data = feature_importance.to_dict('records')

print(f"\n TOP 10 MOST IMPORTANT FEATURES:")
print(f"   (These factors affect productivity the most)\n")

for idx, (_, row) in enumerate(feature_importance.head(10).iterrows(), 1):
    bar_length = int(row['importance'] * 60)
    bar = "█" * bar_length
    percentage = row['importance'] * 100
    print(f"   {idx:2d}. {row['feature']:30s} {bar} {percentage:.2f}%")

print(f"\n BOTTOM 5 LEAST IMPORTANT FEATURES:")
print(f"   (These factors have minimal impact)\n")

for idx, (_, row) in enumerate(feature_importance.tail(5).iterrows(), 1):
    percentage = row['importance'] * 100
    print(f"   {row['feature']:30s}: {percentage:.2f}%")

# ============================================================================
# STEP 7: SAVE MODEL & ARTIFACTS
# ============================================================================

print("\n" + "="*80)
print(" STEP 7: SAVING MODEL & ARTIFACTS")
print("="*80)

try:
    # Create directory
    Path('models/productivity').mkdir(parents=True, exist_ok=True)
    
    # Save model
    model_path = 'models/productivity/xgboost_model.pkl'
    with open(model_path, 'wb') as f:
        pickle.dump(model, f)
    print(f"    Model saved: {model_path}")
    
    # Save scaler
    scaler_path = 'models/productivity/scaler.pkl'
    with open(scaler_path, 'wb') as f:
        pickle.dump(scaler, f)
    print(f"    Scaler saved: {scaler_path}")
    
    # Save feature columns
    features_path = 'models/productivity/features.json'
    with open(features_path, 'w') as f:
        json.dump(feature_columns, f, indent=2)
    print(f"    Features saved: {features_path}")
    
    # Save feature importance
    importance_path = 'models/productivity/importance.json'
    with open(importance_path, 'w') as f:
        json.dump(feature_importance_data, f, indent=2)
    print(f"    Feature importance saved: {importance_path}")
    
    # Save label encoders
    encoders_path = 'models/productivity/encoders.pkl'
    with open(encoders_path, 'wb') as f:
        pickle.dump(label_encoders, f)
    print(f"    Label encoders saved: {encoders_path}")
    
    # Save training results
    results = {
        'training_metrics': {
            'rmse': float(train_rmse),
            'mae': float(train_mae),
            'r2': float(train_r2)
        },
        'test_metrics': {
            'rmse': float(test_rmse),
            'mae': float(test_mae),
            'r2': float(test_r2)
        },
        'dataset': {
            'total_records': len(df),
            'training_samples': len(X_train),
            'test_samples': len(X_test),
            'total_features': len(feature_columns)
        }
    }
    
    results_path = 'models/productivity/results.json'
    with open(results_path, 'w') as f:
        json.dump(results, f, indent=2)
    print(f"    Results saved: {results_path}")
    
except Exception as e:
    print(f"    Error saving files: {str(e)}")
    exit(1)

# ============================================================================
# FINAL SUMMARY
# ============================================================================

print("\n" + "="*80)
print(" TRAINING COMPLETED SUCCESSFULLY!")
print("="*80)

print(f"\n FINAL SUMMARY:")
print(f"    Dataset: 2000 records loaded")
print(f"    Model: XGBoost trained with 200 estimators")
print(f"    Test R² Score: {test_r2:.4f}")
print(f"    Prediction Accuracy: ±{test_mae:.2f} points")
print(f"    All files saved to: models/productivity/")

print(f"\n Generated Files:")
print(f"   1. xgboost_model.pkl - Trained model")
print(f"   2. scaler.pkl - Feature scaler")
print(f"   3. features.json - Feature column names")
print(f"   4. importance.json - Feature importance ranking")
print(f"   5. encoders.pkl - Categorical encoders")
print(f"   6. results.json - Training metrics")

print(f"\n TOP 3 PRODUCTIVITY FACTORS:")
for idx, (_, row) in enumerate(feature_importance.head(3).iterrows(), 1):
    print(f"   {idx}. {row['feature']}")

print("\n" + "="*80)
print(" Ready to use the model in your chatbot agent!")
print("="*80 + "\n")
