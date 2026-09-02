export type BuilderType = 'document' | 'form' | 'website' | 'workflow';

export interface BuilderGenerationParams {
    prompt: string;
    companyId: string;
    userId: string;
    mode?: string;
    sessionId?: string;
    clientId?: string;
    employeeId?: string;
    existingAST?: any;
    meta?: Record<string, any>;
}

export interface BuilderResult<T = any> {
    success: boolean;
    builderType: BuilderType;
    entityId: string;
    title: string;
    editUrl: string;
    shareUrl?: string;
    reply: string;
    explanation?: string;
    ast: T;
    actionCards?: Array<{
        type: 'edit' | 'send' | 'preview' | 'delete';
        label: string;
        url?: string;
        actionKey?: string;
        payload?: Record<string, any>;
    }>;
    message?: string;
}

export interface IUniversalBuilder<T = any> {
    readonly builderType: BuilderType;
    compileAST(params: BuilderGenerationParams): Promise<BuilderResult<T>>;
    patchAST(entityId: string, instruction: string, params: BuilderGenerationParams): Promise<BuilderResult<T>>;
    deleteEntity(entityId: string, companyId: string): Promise<{ success: boolean; message: string }>;
    dispatchEntity?(entityId: string, recipientEmail: string, params: Record<string, any>): Promise<{ success: boolean; shareUrl: string; message: string }>;
}
