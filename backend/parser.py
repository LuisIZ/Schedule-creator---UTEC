import os
import pdfplumber
import pandas as pd
import sys
basedir = os.path.abspath(os.path.dirname(__file__))
sys.path.append(basedir)

from app import app, db
from database import Course, Section, Schedule

def extract_tables_to_df(pdf_path):
    all_data = []
    try:
        with pdfplumber.open(pdf_path) as pdf:
            for page in pdf.pages:
                tables = page.extract_tables()
                for table in tables:
                    for row in table:
                        cleaned_row = [str(cell).replace('\n', ' ').strip() if cell else "" for cell in row]
                        all_data.append(cleaned_row)
    except FileNotFoundError:
        print(f"Warning: File not found {pdf_path}")
        return None

    if not all_data: return None

    max_cols = max(len(row) for row in all_data)
    padded_data = [row + [""] * (max_cols - len(row)) for row in all_data]

    headers = padded_data[0]
    df = pd.DataFrame(padded_data[1:], columns=headers)
    return df

def populate_database():
    general_path = os.path.join(basedir, "..", "Data", "Horario General.pdf")
    personal_path = os.path.join(basedir, "..", "Data", "Horario Personal.pdf")

    print("Extracting Data from PDFs...")
    df_general = extract_tables_to_df(general_path)
    df_personal = extract_tables_to_df(personal_path)

    if df_general is None or df_personal is None:
        print("Required PDFs not found or empty.")
        return

    # Create a mapping of code to type from the Personal PDF ("Obligatorio" or "Electivo")
    course_types = {}
    if "Código Curso" in df_personal.columns and "Tipo" in df_personal.columns:
        for _, row in df_personal.iterrows():
            code = str(row["Código Curso"]).strip()
            ctype = str(row["Tipo"]).strip()
            if code and ctype:
                course_types[code] = ctype

    with app.app_context():
        # Clear existing DB data for clean slate
        db.drop_all()
        db.create_all()

        print("Populating Database...")
        # Populate from General PDF (has all courses and all sections)
        for _, row in df_general.iterrows():
            code = str(row.get("Código Curso", "")).strip()
            if not code or code == "Código Curso": continue # Skip invalid or header repeats

            name = str(row.get("Curso", "")).strip()
            ctype = course_types.get(code, "Otro") # Defaults to Otro if not in personal

            # Get or Create Course
            course = db.session.get(Course, code)
            if not course:
                course = Course(course_code=code, name=name, course_type=ctype)
                db.session.add(course)
                db.session.flush()

            # Create Section
            sec_name = str(row.get("Sesión Grupo", "")).strip()
            modality = str(row.get("Modalidad", "")).strip()
            prof_name = str(row.get("Docente", "")).strip()
            
            section = Section(
                course_code=code, 
                name=sec_name, 
                modality=modality, 
                professor_name=prof_name
            )
            db.session.add(section)
            db.session.flush() # To get section.id

            # Parse Schedule string (e.g., "Mar. 17:00 - 19:00")
            horario = str(row.get("Horario", "")).strip()
            if horario:
                try:
                    day, times = horario.split(".", 1)
                    start, end = times.split("-")
                    
                    schedule = Schedule(
                        section_id=section.id,
                        day=day.strip(),
                        start_time=start.strip(),
                        end_time=end.strip(),
                        frequency=str(row.get("Frecuencia", "")).strip(),
                        location=str(row.get("Ubicación", "")).strip()
                    )
                    db.session.add(schedule)
                except Exception as e:
                    print(f"Skipping badly formatted schedule: {horario}")

        db.session.commit()
    print("Database successfully populated! Run 'python backend/app.py' to start.")

if __name__ == '__main__':
    populate_database()
