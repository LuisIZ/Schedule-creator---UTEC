import os
import pdfplumber
import pandas as pd

# Calculamos la ruta base dinámicamente (subimos un nivel desde temp_scripts)
script_dir = os.path.dirname(os.path.abspath(__file__))
base_dir = os.path.dirname(script_dir)

def extract_tables(pdf_path, out_csv_path, out_txt_path):
    if not os.path.exists(pdf_path):
        print(f"Archivo no encontrado: {pdf_path}")
        return

    print(f"Extracting tables from {pdf_path}...")
    all_data = []
    
    with pdfplumber.open(pdf_path) as pdf:
        for page in pdf.pages:
            tables = page.extract_tables()
            for table in tables:
                for row in table:
                    cleaned_row = [str(cell).replace('\n', ' ').strip() if cell else "" for cell in row]
                    all_data.append(cleaned_row)

    if not all_data: return

    df = pd.DataFrame(all_data)
    df.to_csv(out_csv_path, index=False, encoding='utf-8-sig')
    
    with open(out_txt_path, 'w', encoding='utf-8') as f:
        f.write(df.to_string(index=False))

# Ejecución con rutas relativas
extract_tables(os.path.join(base_dir, "Data", "Horario General.pdf"), 
               os.path.join(base_dir, "temp_scripts", "general_table.csv"),
               os.path.join(base_dir, "temp_scripts", "general_table.txt"))