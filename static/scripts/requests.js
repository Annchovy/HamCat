function sendSelection() {
    const dropdown = document.getElementById("method-select");
    const selectedValue = dropdown.value;

    fetch('/method_selection', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({'selection': selectedValue}),
    })
    .then(response => response.json())
    .then(data => {
        console.log('Success:', data);
        window.updateScatterPlot(data.result);
    })
    .catch((error) => {
        console.error('Error:', error);
    });
}