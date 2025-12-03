import { useState, useEffect } from "react";
import "./LogIn.css";

import { FaUser, FaEye, FaEyeSlash } from "react-icons/fa";
import { TbLockPassword } from "react-icons/tb";
import { useNavigate } from "react-router-dom";
import axios from "axios";

const LogIn = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    document.title = "Log in | Emergency";
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await axios.post("http://127.0.0.1:8000/login/", {
        email: email,
        password: password,
      });
      if (response.data) {
       console.log("Login successful:", response.data);
       localStorage.setItem("access_token", response.data.access_token);
       localStorage.setItem("refresh_token", response.data.refresh_token);
      //  navigate("/");
      }
    } catch (err) {
      console.error("Login failed:", err);
      setError("Invalid email or password. Please try again.");
    } finally {
      setLoading(false);
    }

  
  };

  return (
    <div className="login">
      <div className="bg">
        {/* Left Side */}
        <div className="title-section">
          <h1 className="Title">Emergency</h1>
          <p className="slogon">Quick Response System</p>
        </div>

        {/* Right Side */}
        <div className="main">
          <div className="wrapper">
            <form onSubmit={handleLogin}>
              <h1>Log In</h1>

              <div className="input-box">
                {/* Icon is visually positioned absolute left via CSS */}
                <FaUser className="icon" />
                <input
                  type="text"
                  placeholder="Email or Username"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setError("");
                  }}
                  required
                />
              </div>

              <div className="input-box">
                <TbLockPassword className="icon" />
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setError("");
                  }}
                  required
                />
                <span
                  className="toggle-password"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <FaEyeSlash /> : <FaEye />}
                </span>
              </div>

              <button type="submit" className="submit" disabled={loading}>
                {loading ? "Authenticating..." : "Log In"}
              </button>

              {error && <div className="error-msg">{error}</div>}
              
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LogIn;