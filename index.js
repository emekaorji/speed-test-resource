// const URL = 'https://speed-test-resource.vercel.app/index.txt';
const URL = '/index.txt';

async function getDownloadSpeed(testDuration = 4000) {
	let totalBytes = 0;
	const controller = new AbortController();
	const timeoutId = setTimeout(() => {
		console.log('aborting...');
		controller.abort();
		clearTimeout(timeoutId);
	}, testDuration);
	const startTime = performance.now();

	function getSpeedObject(_totalBytes, _endTime) {
		const durationInSeconds = (_endTime - startTime) / 1000;
		console.log(
			(_totalBytes / 1024 / 1024).toFixed(2) +
				'mb in ' +
				durationInSeconds.toFixed(2) +
				' seconds | ' +
				(_totalBytes / 1024 / 1024 / durationInSeconds).toFixed(2) +
				'mbps'
		);
		const asBytesPerSecond = _totalBytes / durationInSeconds;
		const asKiloBytesPerSecond = _totalBytes / 1024 / durationInSeconds;
		const asMegaBytesPerSecond = _totalBytes / 1024 / 1024 / durationInSeconds;

		return {
			asBytesPerSecond,
			asKiloBytesPerSecond,
			asMegaBytesPerSecond,
		};
	}

	let read = async () => ({
		done: false,
		speed: getSpeedObject(totalBytes, performance.now()),
	});

	try {
		const response = await fetch(URL, { signal: controller.signal });
		const reader = response.body?.getReader();
		read = async function () {
			const readResult = await reader?.read();
			if (!readResult.done) {
				const downloadedSizeInBytes = readResult.value.length;
				totalBytes += downloadedSizeInBytes;
				// console.log(new TextDecoder().decode(readResult.value.buffer));
				return {
					done: false,
					speed: getSpeedObject(totalBytes, performance.now()),
				};
			} else {
				return {
					done: true,
					speed: getSpeedObject(totalBytes, performance.now()),
				};
			}
		};
	} catch (error) {
		if (error.name === 'AbortError') {
			console.log('Request was aborted due to time lapse');
			console.log('Total Bytes Downloaded:' + totalBytes);
			read = async () => ({
				done: true,
				speed: getSpeedObject(totalBytes, performance.now()),
			});
		} else {
			console.error('Error:', error.message);
		}
	}

	return {
		read,
	};
}

getDownloadSpeed(800).then(({ read }) => {
	function reread() {
		return read().then(({ done, speed }) => {
			if (!done) {
				console.log(speed.asMegaBytesPerSecond);
				return reread();
			}
		});
	}
	reread();
});
