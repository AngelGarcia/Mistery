import { UserSearch } from "lucide-react";

export function Header() {
  return (
    <header className="bg-primary text-primary-foreground shadow-md">
      <div className="container mx-auto flex h-16 items-center px-4">
        <UserSearch className="h-8 w-8 mr-3" />
        <h1 className="text-2xl font-bold tracking-tight font-headline">
          Mystery Match
        </h1>
      </div>
    </header>
  );
}
