// src/pages/NotFoundPage.jsx
import { Link } from 'react-router-dom';
import { Compass } from 'lucide-react';
import Button from '../components/common/Button';

export default function NotFoundPage() {
  return (
    <div className="flex h-screen flex-col items-center justify-center gap-4 bg-bg px-4 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-soft text-primary">
        <Compass size={22} />
      </span>
      <h1 className="font-display text-2xl font-semibold text-ink">Page not found</h1>
      <p className="text-sm text-ink-muted">The page you&apos;re looking for doesn&apos;t exist.</p>
      <Link to="/"><Button>Back to dashboard</Button></Link>
    </div>
  );
}
