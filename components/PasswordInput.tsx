"use client";

import { type InputHTMLAttributes, useState } from "react";

type PasswordInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & {
  label: string;
  hint?: string;
};

export function PasswordInput({ label, hint, id, ...inputProps }: PasswordInputProps) {
  const [visible, setVisible] = useState(false);

  return <div className="password-control">
    <label htmlFor={id}>{label}</label>
    <div className="password-input-wrap">
      <input {...inputProps} id={id} type={visible ? "text" : "password"} />
      <button
        aria-controls={id}
        aria-label={`${visible ? "Ocultar" : "Mostrar"} ${label.toLowerCase()}`}
        aria-pressed={visible}
        onClick={() => setVisible((current) => !current)}
        type="button"
      >
        <span aria-hidden="true">{visible ? "◉" : "◎"}</span>
        {visible ? "Ocultar" : "Mostrar"}
      </button>
    </div>
    {hint && <small>{hint}</small>}
  </div>;
}
