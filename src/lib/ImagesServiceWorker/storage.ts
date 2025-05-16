if ("storage" in navigator && "estimate" in navigator.storage) {
  navigator.storage.estimate().then((estimate) => {
    const usedBytes = estimate.usage;
    const totalBytes = estimate.quota;

    console.log(`Used: ${usedBytes} bytes`);
    console.log(`Total: ${totalBytes} bytes`);
    console.log(`Usage: ${((usedBytes / totalBytes) * 100).toFixed(2)}%`);
  });
} else {
  console.log("Storage API not supported in this browser.");
}
