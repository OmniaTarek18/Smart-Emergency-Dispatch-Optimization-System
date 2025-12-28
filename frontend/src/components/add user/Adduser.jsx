import { useState, useEffect } from "react";
import { FaUser, FaEye, FaEyeSlash, FaUserShield } from "react-icons/fa";
import { MdEmail } from "react-icons/md";
import { TbLockPassword } from "react-icons/tb";
import api from "../../interceptor/api";
import "./AddUser.css";

const AddUser = () => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    role: "responder"
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    document.title = "Add User | Emergency";
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    const token = localStorage.getItem("access_token");

    console.log("Submitting form data:", formData);

    try {
      const token = localStorage.getItem("access_token");
      const response = await api.post("http://127.0.0.1:8000/admin/users/create/", formData, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      if (response.data) {
        console.log("User added successfully:", response.data);
        setSuccess("User added successfully!");
        // Reset form
        setFormData({
          name: "",
          email: "",
          password: "",
          role: "responder"
        });
      }
    } catch (err) {
      console.error("Failed to add user:", err);
      setError(err.response?.data?.detail || "Failed to add user. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    setError("");
    setSuccess("");
  };

  return (
    <div className="add-user">
      <div className="bg">
        {/* Left Side */}
        <div className="title-section">
          <h1 className="Title">Emergency</h1>
          <p className="slogon">User Management System</p>
        </div>

        {/* Right Side */}
        <div className="main">
          <div className="wrapper">
            <form onSubmit={handleSubmit}>
              <h1>Add User</h1>

              <div className="input-box">
                <FaUser className="icon" />
                <input
                  type="text"
                  name="name"
                  placeholder="Full Name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="input-box">
                <MdEmail className="icon" />
                <input
                  type="email"
                  name="email"
                  placeholder="Email Address"
                  value={formData.email}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="input-box">
                <TbLockPassword className="icon" />
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  placeholder="Password"
                  value={formData.password}
                  onChange={handleChange}
                  required
                />
                <span
                  className="toggle-password"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <FaEyeSlash /> : <FaEye />}
                </span>
              </div>

              <div className="input-box">
                <FaUserShield className="icon" />
                <select
                  name="role"
                  value={formData.role}
                  onChange={handleChange}
                  required
                >
                  <option value="responder">Responder</option>
                  <option value="dispatcher">Dispatcher</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

              <button type="submit" className="submit" disabled={loading}>
                {loading ? "Adding User..." : "Add User"}
              </button>

              {error && <div className="error-msg">{error}</div>}
              {success && <div className="success-msg">{success}</div>}
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AddUser;