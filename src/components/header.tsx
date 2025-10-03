import { UserSearch } from "lucide-react";

export function Header() {
  return (
    <header className="bg-transparent text-primary-foreground">
      <div className="container mx-auto flex h-16 items-center px-4">
        <UserSearch className="h-8 w-8 mr-3 text-primary" />
        <h1 className="text-2xl font-bold tracking-tight font-headline">
          ¿Quién es Quién?
        </h1>
      </div>
    </header>
  );
}
