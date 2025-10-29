
'use client';

import { useEffect, useState } from 'react';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { useToast } from '@/hooks/use-toast';
import { AlertTriangle, Info } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
} from '@/components/ui/alert-dialog';
import { Badge } from './ui/badge';

export function FirebaseErrorListener() {
  const [error, setError] = useState<FirestorePermissionError | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const handleError = (e: FirestorePermissionError) => {
      console.error("Firestore Permission Error Caught:", e);
      setError(e);
      // Also show a toast for less intrusive feedback
      toast({
        variant: "destructive",
        title: "Error de Permisos de Firestore",
        description: "Se ha denegado una operación. Revisa las reglas de seguridad.",
      });
    };

    errorEmitter.on('permission-error', handleError);

    return () => {
      errorEmitter.off('permission-error', handleError);
    };
  }, [toast]);

  const handleClose = () => {
    setError(null);
  };

  if (!error) {
    return null;
  }

  const { context } = error;
  const isRead = context.operation === 'get' || context.operation === 'list';
  const isWrite = ['create', 'update', 'delete'].includes(context.operation);

  const suggestedRule = `// Allow ${isRead ? 'reading' : 'writing'} the document
allow ${context.operation}: if request.auth != null;`;

  return (
    <AlertDialog open={!!error} onOpenChange={(open) => !open && handleClose()}>
      <AlertDialogContent className="max-w-2xl">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle />
            Error de Permisos de Firestore
          </AlertDialogTitle>
          <AlertDialogDescription>
            La siguiente solicitud fue denegada por tus Reglas de Seguridad de Firestore.
            Para que esta operación funcione, necesitas actualizar tus reglas de seguridad.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="my-4 space-y-4 text-sm bg-muted p-4 rounded-md border">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold">Operación:</h3>
            <Badge variant="destructive" className="uppercase">{context.operation}</Badge>
          </div>
          <div>
            <h3 className="font-semibold">Ruta del Recurso:</h3>
            <code className="text-muted-foreground break-all">{context.path}</code>
          </div>
          {context.requestResourceData && (
            <div>
              <h3 className="font-semibold">Datos de la Solicitud (para escrituras):</h3>
              <pre className="mt-1 text-xs bg-background p-2 rounded-md overflow-x-auto">
                <code>{JSON.stringify(context.requestResourceData, null, 2)}</code>
              </pre>
            </div>
          )}
        </div>
        
        <div className="my-4 space-y-2">
            <div className="flex items-center gap-2 text-primary">
                <Info size={18}/>
                <h3 className="font-semibold">Sugerencia de Regla</h3>
            </div>
            <p className="text-xs text-muted-foreground">
                Para permitir esta operación específica, puedes añadir una regla como la siguiente a tu archivo <code className="font-semibold">firestore.rules</code>:
            </p>
             <pre className="mt-1 text-xs bg-background p-3 rounded-md overflow-x-auto">
                <code>
                    {`rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {
    match /${context.path.replace(/\{[^}]+\}/g, '{docId}')} {
      ${suggestedRule}
    }
  }
}`}
                </code>
            </pre>
            <p className="text-xs text-muted-foreground pt-2">
               Recuerda que esta es una sugerencia básica. Debes adaptarla a tus necesidades de seguridad, por ejemplo, comprobando si el usuario es el propietario del documento.
            </p>
        </div>


        <AlertDialogFooter>
          <AlertDialogAction onClick={handleClose}>Entendido</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

