"""
Unit tests for UploadService — schema validation and type coercion.
Tests run without a database (validate logic only).
"""
from __future__ import annotations

import io

import pandas as pd
import pytest

from app.services.upload_service import UploadService


class TestFileParser:
    """Test CSV/XLSX parsing."""

    def _make_svc(self):
        return UploadService.__new__(UploadService)  # no db needed for parse/validate

    def test_parse_valid_csv(self):
        csv = b"cycle_id,date,channel,sub_channel,variable,spend,reach,value\nC1,2025-01-01,TV,Cable,sales,1000,5000,20000\n"
        svc = self._make_svc()
        df = svc._parse_file(csv, "data.csv")
        assert len(df) == 1
        assert "cycle_id" in df.columns

    def test_parse_unsupported_format(self):
        from app.core.exceptions import UploadError
        svc = self._make_svc()
        with pytest.raises(UploadError):
            svc._parse_file(b"data", "file.json")

    def test_validate_schema_missing_cols(self):
        svc = self._make_svc()
        df = pd.DataFrame({"cycle_id": ["C1"], "date": ["2025-01-01"]})
        errors = svc._validate_schema(df, is_datafile=True)
        assert len(errors) > 0
        assert any("missing" in e["message"].lower() for e in errors)

    def test_validate_schema_valid(self):
        svc = self._make_svc()
        cols = ["cycle_id", "date", "channel", "sub_channel", "variable",
                "spend", "reach", "value"]
        df = pd.DataFrame({c: ["x"] for c in cols})
        errors = svc._validate_schema(df, is_datafile=True)
        assert errors == []

    def test_coerce_types_bad_numeric(self):
        svc = self._make_svc()
        df = pd.DataFrame({
            "cycle_id": ["C1"],
            "date": ["2025-01-01"],
            "channel": ["TV"],
            "sub_channel": ["Cable"],
            "variable": ["sales"],
            "spend": ["NOT_A_NUMBER"],
            "reach": ["5000"],
            "value": ["20000"],
        })
        _, errors = svc._coerce_types(df, is_datafile=True)
        assert any("spend" in e["field"] for e in errors)

    def test_coerce_types_bad_date(self):
        svc = self._make_svc()
        df = pd.DataFrame({
            "cycle_id": ["C1"],
            "date": ["01/15/2025"],  # wrong format
            "channel": ["TV"],
            "sub_channel": ["Cable"],
            "variable": ["sales"],
            "spend": ["1000"],
            "reach": ["5000"],
            "value": ["20000"],
        })
        _, errors = svc._coerce_types(df, is_datafile=True)
        assert any("date" in e["field"] for e in errors)

    def test_safe_float_handles_empty(self):
        svc = self._make_svc()
        assert svc._safe_float("") is None
        assert svc._safe_float(None) is None
        assert svc._safe_float("3.14") == pytest.approx(3.14)

    def test_safe_int_handles_float_strings(self):
        svc = self._make_svc()
        assert svc._safe_int("8.0") == 8
        assert svc._safe_int("bad") is None
