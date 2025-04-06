import React, { useState, useEffect } from 'react';

const ApiTest = () => {
  const [message, setMessage] = useState('');
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch('http://localhost:4000/api')
      .then((response) => {
        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }
        return response.json();
      })
      .then((data) => {
        setMessage(data.message);
      })
      .catch((err) => {
        setError(err.message);
      });
  }, []);

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold">API Test</h2>
      {error ? (
        <p className="text-red-500">Error: {error}</p>
      ) : (
        <p>Message from API: {message}</p>
      )}
    </div>
  );
};

export default ApiTest;