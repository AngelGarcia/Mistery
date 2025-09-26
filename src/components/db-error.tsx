
import { AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';

type DbErrorProps = {
  message: string;
  projectId: string;
};

export function DbError({ message, projectId }: DbErrorProps) {
  const firestoreUrl = `https://console.cloud.google.com/datastore/setup?project=${projectId}`;

  return (
    <div className="flex items-center justify-center min-h-screen bg-muted/40">
      <Card className="w-full max-w-lg text-center shadow-lg border-destructive/50">
        <CardHeader>
          <CardTitle className="flex flex-col items-center gap-4 text-destructive">
            <AlertTriangle className="w-12 h-12" />
            Error de Conexión con la Base de Datos
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <p className="text-lg text-muted-foreground">{message}</p>
          <p>
            Para que la aplicación funcione, es necesario activar Cloud Firestore en tu proyecto de Firebase.
          </p>
          <Button asChild variant="destructive" size="lg">
            <a href={firestoreUrl} target="_blank" rel="noopener noreferrer">
              Activar Firestore en la Consola de Google Cloud
            </a>
          </Button>
          <p className="text-sm text-muted-foreground pt-4">
            Después de activarlo, por favor, recarga esta página.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

    