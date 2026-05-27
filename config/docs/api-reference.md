# SpendSmart API Reference

Base URL: `http://localhost:8000/api/v1`
Interactive docs: `http://localhost:8000/docs`

All endpoints (except `/auth/login` and `/health`) require:
```
Authorization: Bearer <access_token>
```

---

## Auth

### POST /auth/login
Login with username + password.

**Request:**
```json
{ "username": "analyst", "password": "analyst123" }
```

**Response:**
```json
{
  "access_token": "eyJ...",
  "token_type": "bearer",
  "user_id": 2,
  "username": "analyst",
  "role": "brand intelligence analyst",
  "permissions": ["DATA INPUT", "DATA HISTORY", "MODEL SUMMARY", "SCENARIO PLANNING", "SCENARIO OUTCOME", "SCENARIO COMPARISONS"]
}
```

### GET /auth/me
Returns current authenticated user.

---

## Cycles

### GET /cycles
List all planning cycles.

### POST /cycles
Create a new cycle.
```json
{
  "cycle_id": "C2026Q1",
  "target_variable": "sales",
  "time_granularity": "weekly",
  "cycle_start_date": "2026-01-01",
  "cycle_end_date": "2026-03-31"
}
```

---

## Uploads

### POST /uploads/data-fact
Upload DATA_FACT file (CSV or XLSX).

**Form data:**
- `file`: File (required)
- `cycle_id`: string (optional)

**Required columns:** `cycle_id, date, channel, sub_channel, variable, spend, reach, value`

**Response:**
```json
{
  "upload_id": 1,
  "status": "success",
  "row_count": 1500,
  "errors": [],
  "warnings": ["12 duplicate rows removed."],
  "message": "Successfully ingested 1500 rows."
}
```

### POST /uploads/model-fact
Upload MODEL_FACT file (externally generated MMM output).

**Required columns:** `cycle_id, variable, channel, sub_channel, category, estimate, curve_type, curvature, adstock_rate, adstock_horizon, p_value, impactable_sales_pct, base_sales`

---

## Scenarios

### GET /scenarios
List scenarios. Optional: `?cycle_id=C2026Q1&is_pending=true`

### POST /scenarios
Create a scenario.
```json
{
  "scenario_name": "Q1 2026 Baseline",
  "cycle_id": "C2026Q1",
  "scenario_type": "Spend Based",
  "is_public": true,
  "category_constraint": "CONSUMER, HCP NPP",
  "target_spend": 5000000,
  "constraints": [
    { "channel_id": 1, "min_spend_pct": -20, "max_spend_pct": 30 },
    { "channel_id": 2, "min_spend_pct": -15, "max_spend_pct": 25 }
  ]
}
```

### POST /scenarios/{id}/run
**Trigger the optimizer.** Runs scipy SLSQP, stores results.

**Response:**
```json
{
  "status": "success",
  "scenario_id": 5,
  "converged": true,
  "message": "Optimizer completed. ROI: 2.847",
  "outcome": {
    "total_sales": 14200000,
    "total_spend": 5000000,
    "impactable_sales": 5800000,
    "roi": 1.16,
    "mroi": 0.94
  }
}
```

### GET /scenarios/{id}/outcome
Fetch stored optimization results.

---

## Reports

### GET /reports/model-summary/{cycle_id}
Model Insights screen data — KPIs + channel breakdown.

### GET /reports/data-history/{cycle_id}
Data History screen — paginated DATA_FACT rows.
Optional: `?channel=TV&page=2&page_size=25`

### GET /reports/dashboard
Homepage KPI cards.
Optional: `?cycle_id=C2026Q1`

---

## Users (Admin only)

### GET /users
### POST /users
### PATCH /users/{id}
### DELETE /users/{id}

---

## Error Responses

All errors return:
```json
{
  "detail": "Human-readable error message",
  "error_type": "NotFoundError"
}
```

| Status | Error Type | Meaning |
|--------|-----------|---------|
| 401 | AuthenticationError | Missing or invalid token |
| 403 | AuthorizationError | Insufficient permissions |
| 404 | NotFoundError | Resource not found |
| 409 | ConflictError | Duplicate resource |
| 422 | ValidationError / UploadError | Bad input |
| 500 | OptimizerError | Solver failure |
