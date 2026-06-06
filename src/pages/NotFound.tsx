import { useSeoMeta } from '@unhead/react';
import { useLocation, Link } from 'react-router-dom';
import { useEffect } from 'react';
import { ArrowLeft } from 'lucide-react';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { BrandMark } from '@/components/BrandMark';

const NotFound = () => {
  const location = useLocation();

  useSeoMeta({
    title: '404 — relaying.earth',
    description:
      'That route doesn\'t exist on relaying.earth. Head back to the globe to keep exploring.',
  });

  useEffect(() => {
    console.error(
      '404 Error: User attempted to access non-existent route:',
      location.pathname,
    );
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Navbar />
      <main className="relative flex flex-1 items-center justify-center px-6 py-16">
        <div className="pointer-events-none absolute inset-0 bg-grid opacity-25" />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_30%,var(--background)_70%)]" />
        <div className="relative text-center">
          <BrandMark className="mx-auto h-14 w-14" static />
          <p className="mt-8 font-mono text-[10px] uppercase tracking-[0.28em] text-primary">
            404 · no signal
          </p>
          <h1 className="mt-2 font-display text-5xl font-semibold tracking-tight sm:text-6xl">
            Off the network.
          </h1>
          <p className="mx-auto mt-3 max-w-md text-sm text-muted-foreground">
            <span className="font-mono text-foreground">{location.pathname}</span> isn't a
            valid route on relaying.earth. The relay didn't recognise it.
          </p>
          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <Link to="/">
              <Button className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                Back to the globe
              </Button>
            </Link>
            <Link to="/stations">
              <Button variant="outline">Browse stations</Button>
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default NotFound;
