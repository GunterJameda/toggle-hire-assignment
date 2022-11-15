import React, { useRef, useState } from "react";
import styles from "./App.module.css";

function App() {
  const inputRef = useRef(null);
  const [parsedFiles, setParsedFiles] = useState([]);
  const [files, setFiles] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState();
  const [showSuccess, setShowSuccess] = useState(false);

  const onInputChange = async (event) => {
    event.preventDefault();
    setShowSuccess(false);
    setError();
    setIsDragging(false);

    let files;

    if (event.dataTransfer) {
      if (event.dataTransfer.items) {
        files = [...event.dataTransfer.items].map((i) => i.getAsFile());
      } else {
        files = [...event.dataTransfer.files];
      }
    } else {
      files = [...event.target.files];
    }

    const parsedFiles = await Promise.all(
      files.map((file) => {
        return new Promise((resolve) => {
          const reader = new FileReader();

          reader.addEventListener("load", (event) => {
            const result = atob(event.target.result.split("base64,")[1]);
            const emails = result.trim().split("\n");
            const emailCount = emails.length;

            resolve({ emailCount, content: emails, file });
          });

          reader.readAsDataURL(file);
        });
      })
    );

    setParsedFiles(parsedFiles);
  };

  const onSendFormClick = async () => {
    if (!parsedFiles.length) {
      return;
    }

    setIsSending(true);

    const emails = parsedFiles.reduce((acc, f) => acc.concat(f.content), []);

    const requestBody = JSON.stringify({ emails });

    const response = await fetch(
      "https://toggl-hire-frontend-homework.onrender.com/api/send",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: requestBody,
      }
    );

    setIsSending(false);

    if (response.status === 200) {
      setShowSuccess(true);
      setParsedFiles([]);
      setFiles([]);
      setError();
      return;
    }

    const body = await response.json();

    setError(body);
  };

  const getErrorMessage = () => {
    if (!error) {
      return "";
    }

    if (error.error === "send_failure") {
      return "Failed to send email to some addresses";
    }

    if (error.error === "invalid_email_address") {
      return "Wrongly typed email addresses";
    }
  };

  return (
    <main className={styles.container}>
      {isSending && (
        <div className={styles.overlay}>
          <div className={styles.spinner} />
        </div>
      )}
      <section
        className={`${styles.dragZone} ${isDragging ? styles.isDragging : ""}`}
        onDragEnter={() => setIsDragging(true)}
        onDragLeave={() => setIsDragging(false)}
        onDragOver={(e) => e.preventDefault()}
        onDrop={onInputChange}
        onClick={() => inputRef.current.click()}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          className={styles.input}
          onChange={onInputChange}
          value={files}
        />
        <span>Click or drag and drop your files here</span>
      </section>

      <section className={styles.infoContainer}>
        <h4>Files collected</h4>

        {parsedFiles.length ? (
          <ul className={styles.list}>
            {parsedFiles.map((f) => (
              <li key={f.file.name}>
                File "{f.file.name}" ({f.emailCount} email addresses found)
              </li>
            ))}
          </ul>
        ) : (
          <p className={styles.noFileFound}>No files added</p>
        )}

        <button className={styles.button} onClick={onSendFormClick}>
          SEND FORM
        </button>
      </section>

      {showSuccess && !error && (
        <section className={styles.feedbackContainer}>
          <h4>Emails sent Successfully!</h4>
        </section>
      )}

      {error && !showSuccess && (
        <section className={styles.feedbackContainer}>
          <h4>There was an error: {getErrorMessage()}</h4>
          <ul className={styles.list}>
            {error.emails.map((a) => (
              <li key={a}>{a}</li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}

export default App;
