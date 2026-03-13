import sys
import subprocess
import os

def install(package):
    subprocess.check_call([sys.executable, "-m", "pip", "install", package])

try:
    import pdfplumber
    import pandas as pd
except ImportError:
    print("Installing pdfplumber and pandas...")
    install("pdfplumber")
    install("pandas")
    import pdfplumber
    import pandas as pd

base_dir = r"c:\Users\lfiza\Documents\GitHub\Schedule creator - UTEC"

def extract_tables(pdf_path, out_csv_path, out_txt_path):
    print(f"Extracting tables from {pdf_path}...")
    all_data = []
    
    with pdfplumber.open(pdf_path) as pdf:
        # Extraemos las primeras 3 paginas para tener una buena muestra
        for i, page in enumerate(pdf.pages):
            tables = page.extract_tables()
            for table in tables:
                for row in table:
                    cleaned_row = [str(cell).replace('\n', ' ').strip() if cell else "" for cell in row]
                    all_data.append(cleaned_row)

    if not all_data:
        print(f"No tables found in {pdf_path}")
        return

    max_cols = max(len(row) for row in all_data)
    padded_data = [row + [""] * (max_cols - len(row)) for row in all_data]

    headers = padded_data[0] if len(padded_data) > 0 else None
    
    # Algunas filas podrían no coincidir si la tabla se corta
    try:
        df = pd.DataFrame(padded_data[1:], columns=headers)
    except Exception as e:
        # Fallback sin headers
        df = pd.DataFrame(padded_data)

    df.to_csv(out_csv_path, index=False, encoding='utf-8-sig')
    
    with open(out_txt_path, 'w', encoding='utf-8') as f:
        f.write(df.to_string(index=False))
        
    print(f"Saved to {out_csv_path} and {out_txt_path}")

extract_tables(os.path.join(base_dir, "Data", "Horario General.pdf"), 
               os.path.join(base_dir, "temp_scripts", "general_table.csv"),
               os.path.join(base_dir, "temp_scripts", "general_table.txt"))

extract_tables(os.path.join(base_dir, "Data", "Horario Personal.pdf"), 
               os.path.join(base_dir, "temp_scripts", "personal_table.csv"),
               os.path.join(base_dir, "temp_scripts", "personal_table.txt"))
