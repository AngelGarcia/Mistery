
export type SecurityRuleContext = {
    path: string;
    operation: 'get' | 'list' | 'create' | 'update' | 'delete' | 'write';
    requestResourceData?: any;
};

export class FirestorePermissionError extends Error {
    public readonly context: SecurityRuleContext;

    constructor(context: SecurityRuleContext) {
        const message = `FirestoreError: Missing or insufficient permissions: The following request was denied by Firestore Security Rules:\n${JSON.stringify({
            context: {
                ...context,
            },
        }, null, 2)}`;
        
        super(message);
        this.name = 'FirestorePermissionError';
        this.context = context;

        // This is to make the error message more readable in the browser console
        Object.setPrototypeOf(this, FirestorePermissionError.prototype);
    }

    public toString() {
        return this.message;
    }
}

    