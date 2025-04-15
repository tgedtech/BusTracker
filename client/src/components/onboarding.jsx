// client/src/components/Onboarding.jsx

import React, { useState } from 'react';

const Onboarding = () => {
  // State hooks for storing form values and messages
  const [accessCode, setAccessCode] = useState('');
  const [schoolName, setSchoolName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [message, setMessage] = useState('');
  const [sheetId, setSheetId] = useState('');

  // Simulated Google Sign-In: This prompts for email after the access code is validated.
  // We add a default empty string to ensure no hard-coded default value is used.
  const handleGoogleSignIn = async () => {
    // Always prompt for email so the user must enter a value
    const emailFromGoogle = window.prompt(
      "Simulated Google Sign-In: Please enter your email",
      ""
    );
    if (emailFromGoogle && emailFromGoogle.trim() !== "") {
      const trimmedEmail = emailFromGoogle.trim();
      setUserEmail(trimmedEmail);
      setMessage("Signed in as: " + trimmedEmail);
      console.log("User signed in with email:", trimmedEmail);
      return trimmedEmail;
    } else {
      setMessage("Google sign-in failed. Please try again.");
      return null;
    }
  };

  // Validate the access code via the backend
  const handleValidateAccessCode = async () => {
    setMessage("Validating access code...");
    console.log("Validating access code:", accessCode);
    try {
      const response = await fetch('/access-code/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: accessCode })
      });
      const validationData = await response.json();
      if (!validationData.valid) {
        setMessage("Access code validation failed: " + validationData.message);
        console.log("Validation failed with message:", validationData.message);
        return false;
      }
      setMessage("Access code is valid.");
      console.log("Access code validated successfully.");
      return true;
    } catch (error) {
      setMessage("Error validating access code: " + error.message);
      console.error("Error during access code validation:", error);
      return false;
    }
  };

  // Assign the access code to the provided email and school name via the backend
  const handleAssignAccessCode = async (email, schoolName) => {
    setMessage("Assigning access code to your email and school...");
    try {
      const response = await fetch('http://localhost:4000/access-code/assign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: accessCode, email, schoolName }) // Include schoolName in the request body
      });
      console.log("Assign response:", response);
      const assignData = await response.json();
      if (assignData.message) {
        setMessage("Access code assigned successfully!");
        console.log("Access code assigned:", assignData);
        return true;
      } else {
        setMessage("Failed to assign access code.");
        console.log("Assignment failed without message");
        return false;
      }
    } catch (error) {
      setMessage("Error assigning access code: " + error.message);
      console.error("Assignment error:", error);
      return false;
    }
  };

  // Create the school sheet via the backend endpoint
  const handleCreateSheet = async () => {
    setMessage("Creating school sheet...");
    try {
      const response = await fetch('/sheets/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ schoolName })
      });
      const data = await response.json();
      if (data.sheetId) {
        setSheetId(data.sheetId);
        setMessage("Sheet created successfully! Sheet ID: " + data.sheetId);
        console.log("Sheet created with ID:", data.sheetId);
        return true;
      } else {
        setMessage("Error creating sheet: No Sheet ID returned.");
        return false;
      }
    } catch (error) {
      setMessage("Error creating sheet: " + error.message);
      console.error("Sheet creation error:", error);
      return false;
    }
  };

  // Full onboarding flow: Validate code, then prompt for email, assign code, and create sheet.
  const handleFullOnboarding = async (e) => {
    e.preventDefault();
    setMessage("");
    setSheetId("");

    const trimmedAccessCode = accessCode.trim();
    const trimmedSchoolName = schoolName.trim();
    if (!trimmedAccessCode || !trimmedSchoolName) {
      setMessage("Please enter both an access code and a school name.");
      return;
    }
    setAccessCode(trimmedAccessCode);
    setSchoolName(trimmedSchoolName);

    const isValid = await handleValidateAccessCode();
    if (!isValid) return;

    const email = await handleGoogleSignIn();
    if (!email) return;

    // Pass schoolName along with email to handleAssignAccessCode
    const assigned = await handleAssignAccessCode(email, trimmedSchoolName);
    if (!assigned) return;

    await handleCreateSheet();
  };

  return (
    <div className="flex flex-col items-center justify-center p-4 space-y-6">
      <h1 className="text-3xl font-bold">School Onboarding</h1>
      <form onSubmit={handleFullOnboarding} className="w-full max-w-md space-y-4">
        <div>
          <label className="block text-sm font-medium">Access Code</label>
          <input
            type="text"
            value={accessCode}
            onChange={(e) => setAccessCode(e.target.value.trim())}
            className="mt-1 input input-bordered w-full"
            placeholder="Enter your access code"
          />
        </div>
        <div>
          <label className="block text-sm font-medium">School Name</label>
          <input
            type="text"
            value={schoolName}
            onChange={(e) => setSchoolName(e.target.value.trim())}
            className="mt-1 input input-bordered w-full"
            placeholder="Enter your school name"
          />
        </div>
        <button type="submit" className="btn btn-primary w-full">
          Submit Onboarding
        </button>
      </form>
      {message && <div className="alert alert-info w-full max-w-md mt-4">{message}</div>}
      {sheetId && (
        <div className="alert alert-success w-full max-w-md mt-4">
          <p>Your sheet has been created with Sheet ID:</p>
          <p className="font-mono">{sheetId}</p>
        </div>
      )}
    </div>
  );
};

export default Onboarding;