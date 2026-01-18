

export const formatValidationError = (errors : any) => {
    if(!errors || errors.length === 0) return;

    if(Array.isArray(errors) && errors.length > 0) {
        return errors.map(e => e.message).join(',')
    };

    return JSON.stringify(errors)

}