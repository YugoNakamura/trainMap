export function LoadJson<T>(url: string): Promise<T> {
    return fetch(url)
    .then(responce => {
        if(!responce.ok) {
            throw new Error('HTTP Error statis:{$responce.status}');
        }
        return responce.json()
    });
}