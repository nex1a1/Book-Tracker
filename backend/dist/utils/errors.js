export const getErrorMessage = (error) => {
    return error instanceof Error ? error.message : String(error);
};
