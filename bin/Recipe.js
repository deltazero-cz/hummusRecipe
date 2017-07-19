const hummus = require('hummus');
const fs = require('fs');
const path = require('path');
module.exports = class Recipe {
    constructor(src, output, options = {}) {
        this.src = src;
        this.output = output;

        this.logFile = 'hummus-error.log';
        this.annotationsToWrite = [];
        this.annotations = [];

        this._setParameters(options = {});
        const fontSrcPath = options.fontSrcPath || path.join(__dirname, '../fonts');
        this._loadFonts(fontSrcPath);
        this._createWriter();
    }

    _createWriter() {
        if (this.src.toLowerCase() == 'new') {
            this.isNewPDF = true;
            this.writer = hummus.createWriter(this.output);
            // this.createPage(1);
        } else {
            this.read();
            try {
                this.writer = hummus.createWriterToModify(
                    this.src, {
                        modifiedFilePath: this.output,
                        log: this.logFile

                    }
                );
            } catch (err) {
                console.log(err);
            }

        }
    }

    get position() {
        const { ox, oy } = this._reverseCoorinate(this._position.x, this._position.y);
        return { x: ox, y: oy };
    }

    read(src) {
        try {
            src = src || this.src;
            const pdfReader = hummus.createReader(src);
            const pages = pdfReader.getPagesCount();
            if (pages == 0) {
                // broken or modify password protected
                throw 'HummusJS: Unable to read/edit PDF file (pages=0)';
            }
            const metadata = {
                pages
            };
            for (var i = 0; i < pages; i++) {
                const info = pdfReader.parsePage(i);
                const dimensions = info.getMediaBox();
                const rotate = info.getRotate();

                let layout,
                    width,
                    height,
                    pageSize,
                    maxLength;
                let side1 = Math.abs(dimensions[2] - dimensions[0]);
                let side2 = Math.abs(dimensions[3] - dimensions[1]);
                if (side1 > side2 && rotate % 180 === 0) {
                    layout = 'landscape';
                } else
                if (side1 < side2 && rotate % 180 !== 0) {
                    layout = 'landscape';
                } else {
                    layout = 'portrait';
                }

                if (layout === 'landscape') {
                    width = (side1 > side2) ? side1 : side2;
                    height = (side1 > side2) ? side2 : side1;
                    maxLength = width;
                } else {
                    width = (side1 > side2) ? side2 : side1;
                    height = (side1 > side2) ? side1 : side2;
                    maxLength = height;
                }

                pageSize = [width, height].sort((a, b) => {
                    return (a > b) ? 1 : -1;
                });

                const page = {
                    pageNumber: i + 1,
                    mediaBox: dimensions,
                    layout,
                    rotate,
                    width,
                    height,
                    // usually 0
                    offsetX: dimensions[0],
                    offsetY: dimensions[1]
                };
                metadata[page.pageNumber] = page;
            }
            this.metadata = metadata;
        } catch (err) {
            console.log(err);
        };
    }

    endPDF(callback) {
        this.writer.end();
        // This is a work around for copying context will overwrite the current one
        // write annotations at the end.
        this.writer = hummus.createWriterToModify(
            this.output, {
                modifiedFilePath: this.output,
                log: this.logFile
            }
        );
        this._writeAnnotations();
        this.writer.end();

        if (callback) {
            return callback();
        }
    }
}
