import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

export function PasswordInput({ value, onChange, name = "password", required = true }) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="password-field">
      <input
        name={name}
        type={visible ? "text" : "password"}
        value={value}
        onChange={onChange}
        required={required}
      />
      <button
        className="password-toggle"
        type="button"
        onClick={() => setVisible((current) => !current)}
        aria-label={visible ? "Hide password" : "Show password"}
      >
        {visible ? <EyeOff size={17} /> : <Eye size={17} />}
      </button>
    </div>
  );
}
