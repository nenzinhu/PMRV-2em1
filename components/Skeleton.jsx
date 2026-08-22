'use client';

export default function Skeleton({ className = '', ...props }) {
  return (
    <div
      className={`skeleton rounded ${className}`}
      {...props}
    />
  );
}
