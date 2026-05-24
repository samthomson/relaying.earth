import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { LoginArea } from '@/components/auth/LoginArea';
import { Cloud, List, Heart } from 'lucide-react';

export function Navbar() {
  return (
    <header className="border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-40">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          {/* Logo/Brand */}
          <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <Cloud className="h-6 w-6 text-primary" />
            <span className="text-xl font-bold">Nostr Weather</span>
          </Link>

          {/* Navigation */}
          <nav className="flex items-center gap-2">
            <Link to="/stations">
              <Button variant="ghost" size="sm">
                <List className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">Stations</span>
              </Button>
            </Link>
            <Link to="/my-stations">
              <Button variant="ghost" size="sm">
                <Heart className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">My Lists</span>
              </Button>
            </Link>
            <LoginArea className="max-w-48" />
          </nav>
        </div>
      </div>
    </header>
  );
}
