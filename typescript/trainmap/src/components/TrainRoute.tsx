export function TrainRoute() {
    return fetch('test.json')
        .then(response => {
            return response.json();
        })
        .catch(error => {
            console.error('error',error);
        });
}