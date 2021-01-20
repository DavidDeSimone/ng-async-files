import { basename } from "https://deno.land/std@0.83.0/path/mod.ts";

export function resolveHomeDir(filename) {
    if (filename[0] === "~") {
	const home = Deno.env.get("HOME") || "/home";
	filename = filename.replace("~", home);
    }

    return filename;
}

const jsGetTickRate = lisp.functionp(lisp.symbols.js_get_tick_rate) ? lisp.js_get_tick_rate : () => { return 0 };
const jsSetTickRate = lisp.functionp(lisp.symbols.js_set_tick_rate) ? lisp.js_set_tick_rate : () => { };

export function openFileAsync(filename) {
    const oldTick = jsGetTickRate();
    jsSetTickRate(0.001);
    filename = resolveHomeDir(filename);
    const base = basename(filename);
    let old_buffer = lisp.get_buffer(base);
    if (old_buffer) {
	lisp.pop_to_buffer_same_window(old_buffer);
	return;
    }

    
    const lisp_buffer = lisp.get_buffer_create("Loading " + base);
    const final_buffer = lisp.get_buffer_create(base);
    lisp.with_current_buffer(lisp_buffer, () => {
	lisp.erase_buffer();
	lisp.insert("Loading Progress: [                    ]");
	lisp.pop_to_buffer_same_window(lisp_buffer);	
    });

    let totalSize = 1;
    let sizeRead = 0;
    const timer = setInterval(() => {
	const ratio = (sizeRead / totalSize) * 10;
	let string = "Loading Process: [";
	for (let i = 0; i < ratio; ++i) {
	    string += '--';
	}
	for (let j = ratio; j < 10; ++j) {
	    string += '  ';
	}
	
	string += ']';
	lisp.with_current_buffer(lisp_buffer, () => {
	    lisp.erase_buffer();
	    lisp.insert(string);
	});
	
    }, 1);

    let currSize = 1024 * 32;
    const MAX_BUFFER = 256 * 1024 * 1024;
    const readNextChunk = (results) => {
	const { file, size } = results;
	const buf = new Uint8Array(currSize);
	currSize = Math.min(currSize * 2, MAX_BUFFER);
	return Promise.all([
	    Deno.read(file.rid, buf),
	    Promise.resolve({file, buf, size})
	]);
    };

    const processResults = (results) => {
	const bytesRead = results[0];
	const { file, buf, size } = results[1];
	totalSize = size;
	sizeRead += bytesRead;
	console.log(bytesRead);
	const buffer = buf.subarray(0, bytesRead);
	if (!bytesRead) {
	    clearInterval(timer);
	    lisp.with_current_buffer(final_buffer, () => {
		lisp.goto_char(lisp.point_min());
		lisp.set_visited_file_name(filename);
		lisp.normal_mode();
		lisp.not_modified();
	    });
	    lisp.pop_to_buffer_same_window(final_buffer);
	    lisp.kill_buffer(lisp_buffer);
	    jsGetTickRate(oldTick);
	    Deno.close(file.rid);
	} else {
	    const text = new TextDecoder().decode(buffer);
	    if (!lisp.buffer_live_p(lisp_buffer)
		|| !lisp.buffer_live_p(final_buffer)) {
		Deno.close(file.rid);		
		return;
	    }
	    
	    lisp.with_current_buffer(final_buffer, () => {
		lisp.insert(text);
	    });		
	    
	    return readNextChunk({ file, size }).then(processResults);
	}
	    
    };

    Deno.open(filename)
	.then((file) => {
	    const size = Deno.seekSync(file.rid, 0, Deno.SeekMode.End);
	    console.log(size);
	    Deno.seekSync(file.rid, 0, Deno.SeekMode.Start);
	    return { file, size };
	})
	.then(readNextChunk)
	.then(processResults)
	.catch(() => {
	    // @TODO
//	    console.log ("File does not exist...");
	});
};

lisp.defun({
    name: "ng-async-find-file",
    docString: "Loads a local file on disk using async I/O. This will show a loading bar, and switch to the file once load is complete. This function does not currently check to see if the buffer has changed since last opening. Still experiemental",
    interactive: true,
    args: "FFile Name: ",
    func: filename => openFileAsync(filename)
});
