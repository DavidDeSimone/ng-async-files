import { basename } from "https://deno.land/std@0.83.0/path/mod.ts";

export function resolveHomeDir(filename) {
    if (filename[0] === "~") {
	const home = Deno.env.get("HOME") || "/home";
	filename = filename.replace("~", home);
    }

    return filename;
}

export function openFileAsync(filename) {
    filename = resolveHomeDir(filename);
    const base = basename(filename);
    const buffer = lisp.get_buffer_create(base);
    lisp.with_current_buffer(buffer, () => {
	lisp.insert("Loading...");
	lisp.pop_to_buffer_same_window(buffer);	
    });

    const timer = setInterval(() => {
	lisp.with_current_buffer(buffer, () => {
	    lisp.insert("...");
	});
    }, 1000);
    
    Deno.readTextFile(filename)
	.then((response) => {
	    clearInterval(timer);
	    lisp.with_current_buffer(buffer, () => {
		lisp.erase_buffer();
		lisp.insert(response);
		lisp.goto_char(lisp.point_min());
		// @TODO resolve true filename
		lisp.set_visited_file_name(filename);
		lisp.normal_mode();
	    });
	});
};

lisp.defun({
    name: "ng-async-find-file",
    interactive: true,
    args: "FFile Name: ",
    func: filename => openFileAsync(filename)
});
