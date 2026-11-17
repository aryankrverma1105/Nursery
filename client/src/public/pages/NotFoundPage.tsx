import React from 'react';
import { Link } from 'react-router-dom';
import { Sprout, ArrowLeft } from 'lucide-react';

export const NotFoundPage: React.FC = () => {
  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4">
      <div className="text-center space-y-6 max-w-md">
        <div className="w-16 h-16 rounded-3xl bg-brand-100 dark:bg-brand-900 text-brand-800 dark:text-brand-300 flex items-center justify-center mx-auto">
          <Sprout className="w-8 h-8" />
        </div>
        <h1 className="font-serif text-5xl font-bold text-stone-900 dark:text-stone-100">404</h1>
        <h2 className="font-serif text-2xl font-bold text-stone-700 dark:text-stone-300">
          Page Not Located
        </h2>
        <p className="text-sm text-stone-500 leading-relaxed">
          The requested horticultural resource or page route does not exist in our system.
        </p>
        <div>
          <Link
            to="/"
            className="inline-flex items-center gap-2 bg-brand-800 text-white font-semibold px-6 py-3 rounded-xl text-sm shadow hover:bg-brand-900 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Return to Farm Homepage</span>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default NotFoundPage;

