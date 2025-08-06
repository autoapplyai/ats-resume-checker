# filename: server.py

import os
from flask import Flask, request, jsonify
from flask_cors import CORS
import docx
import PyPDF2
from werkzeug.utils import secure_filename
import tempfile

app = Flask(__name__)
CORS(app)  # This enables Cross-Origin Resource Sharing for the front-end

# Define a function to extract text from a DOCX file
def extract_text_from_docx(file_path):
    """
    Extracts text from a .docx file.
    """
    try:
        doc = docx.Document(file_path)
        full_text = []
        for para in doc.paragraphs:
            full_text.append(para.text)
        return '\n'.join(full_text)
    except Exception as e:
        print(f"Error extracting text from DOCX: {e}")
        return None

# Define a function to extract text from a PDF file
def extract_text_from_pdf(file_path):
    """
    Extracts text from a .pdf file.
    """
    try:
        with open(file_path, 'rb') as file:
            reader = PyPDF2.PdfReader(file)
            full_text = []
            for page in reader.pages:
                full_text.append(page.extract_text())
            return '\n'.join(full_text)
    except Exception as e:
        print(f"Error extracting text from PDF: {e}")
        return None

# The main endpoint for file uploads
@app.route('/upload_resume', methods=['POST'])
def upload_resume():
    """
    Handles file upload, extracts text, and returns it.
    """
    if 'resumeFile' not in request.files:
        return jsonify({'error': 'No file part in the request'}), 400

    file = request.files['resumeFile']

    if file.filename == '':
        return jsonify({'error': 'No selected file'}), 400

    if file:
        filename = secure_filename(file.filename)
        # Use a temporary file to save and process the uploaded file
        try:
            with tempfile.NamedTemporaryFile(delete=False, suffix=os.path.splitext(filename)[1]) as temp_file:
                file.save(temp_file.name)
                temp_file_path = temp_file.name
            
            # Get the file extension
            file_extension = os.path.splitext(filename)[1].lower()

            extracted_text = None
            if file_extension == '.docx':
                extracted_text = extract_text_from_docx(temp_file_path)
            elif file_extension == '.pdf':
                extracted_text = extract_text_from_pdf(temp_file_path)
            elif file_extension == '.txt':
                extracted_text = file.stream.read().decode("utf-8")
            else:
                return jsonify({'error': 'Unsupported file type. Please upload a .txt, .docx, or .pdf file.'}), 415

            # Clean up the temporary file
            os.remove(temp_file_path)

            if extracted_text is not None:
                return jsonify({'text_content': extracted_text}), 200
            else:
                return jsonify({'error': 'Failed to extract text from the file.'}), 500

        except Exception as e:
            print(f"Server error during file processing: {e}")
            return jsonify({'error': 'An internal server error occurred during file processing.'}), 500

if __name__ == '__main__':
    # This change tells the server to listen on the port Heroku provides.
    port = int(os.environ.get('PORT', 5000))
    app.run(debug=True, host='0.0.0.0', port=port)

