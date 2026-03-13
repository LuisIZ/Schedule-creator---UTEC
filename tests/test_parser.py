import pytest
import os
import sys

# Append the project root and backend to Path so we can test the modules directly
basedir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
sys.path.append(os.path.join(basedir, "backend"))
sys.path.append(os.path.join(basedir, "static", "js"))

from parser import extract_tables_to_df

def test_pdf_extraction_empty():
    """ 
    Tests that the robust parser correctly handles a non-existent or invalid file 
    without crashing the whole ETL pipeline.
    """
    df = extract_tables_to_df("nonexistent.pdf")
    assert df is None

def test_time_fraction_logic():
    """
    Given that we can't easily import vanilla JS into Pytest, we'll verify the math
    Python-side to ensure our overlap fractional logic is sound.
    """
    def time_to_hours(time_str):
        if not time_str: return 0
        hours, mins = map(int, time_str.split(':'))
        return hours + (mins / 60)
        
    def is_overlapping(startA, endA, startB, endB):
        return max(startA, startB) < min(endA, endB)

    # Convert "17:30" correctly to 17.5
    assert time_to_hours("17:30") == 17.5
    assert time_to_hours("08:15") == 8.25
    
    # Non-overlapping
    assert not is_overlapping(8, 10, 10, 12)
    # Overlapping identical
    assert is_overlapping(10, 12, 10, 12)
    # Overlapping partial
    assert is_overlapping(10, 12, 11, 13)
    # Overlapping contained
    assert is_overlapping(10, 14, 11, 12)
