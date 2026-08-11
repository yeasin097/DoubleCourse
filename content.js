(function () {

    "use strict";

    console.log("Course Duplicate Finder loaded.");

    // ============================================================
    // Find all courses
    // ============================================================

    function findCourses() {

        const rows = document.querySelectorAll("tbody tr");

        const courses = [];

        rows.forEach((row) => {

            const cells = row.querySelectorAll("td");

            if (cells.length < 2) {
                return;
            }

            // ----------------------------------------------------
            // Course code
            // ----------------------------------------------------

            const courseCode = cells[0].innerText.trim();

            if (!courseCode) {
                return;
            }

            // Example:
            // AA 099
            // AA 150
            // CSE 111
            // CSE 112
            // ENG 101

            if (!/^[A-Z]{2,5}\s*\d{3}$/i.test(courseCode)) {
                return;
            }


            // ----------------------------------------------------
            // Course name
            // ----------------------------------------------------

            const courseCell = cells[1];

            const fullText = courseCell.innerText.trim();

            const courseName = fullText
                .split("(")[0]
                .trim();


            // ----------------------------------------------------
            // Class link
            // ----------------------------------------------------

            const classLink =
                courseCell.querySelector("a");


            let classId = "";
            let className = "";


            if (classLink) {

                className =
                    classLink.innerText.trim();


                const href =
                    classLink.getAttribute("href");


                if (href) {

                    const match =
                        href.match(/classid=(\d+)/i);


                    if (match) {

                        classId = match[1];

                    }

                }

            }


            // ----------------------------------------------------
            // Save course
            // ----------------------------------------------------

            courses.push({

                code: courseCode,

                name: courseName,

                classId: classId,

                className: className,

                row: row

            });

        });


        return courses;

    }


    // ============================================================
    // Remove old highlighting
    // ============================================================

    function clearHighlighting() {

        document
            .querySelectorAll(
                "tr.duplicate-course, tr.duplicate-exact"
            )
            .forEach((row) => {

                row.classList.remove(
                    "duplicate-course",
                    "duplicate-exact"
                );

            });

    }


    // ============================================================
    // Scan for duplicates
    // ============================================================

    function findDuplicates() {

        console.log(
            "Course Duplicate Finder: scanning..."
        );


        const courses = findCourses();


        console.log(
            "Courses found:",
            courses.length
        );


        clearHighlighting();


        // ========================================================
        // Maps
        // ========================================================

        const codeMap = new Map();

        const classMap = new Map();


        courses.forEach((course) => {


            // ----------------------------------------------------
            // Course code map
            // ----------------------------------------------------

            if (!codeMap.has(course.code)) {

                codeMap.set(
                    course.code,
                    []
                );

            }

            codeMap
                .get(course.code)
                .push(course);


            // ----------------------------------------------------
            // Course + class ID
            // ----------------------------------------------------

            const key =
                course.code +
                "|" +
                course.classId;


            if (!classMap.has(key)) {

                classMap.set(
                    key,
                    []
                );

            }

            classMap
                .get(key)
                .push(course);

        });


        const duplicateCodes = [];

        const exactDuplicates = [];


        // ========================================================
        // Duplicate course codes
        // ========================================================

        codeMap.forEach(
            (entries, code) => {

                if (entries.length > 1) {

                    duplicateCodes.push({

                        code: code,

                        entries: entries

                    });


                    entries.forEach(
                        (course) => {

                            course.row.classList.add(
                                "duplicate-course"
                            );

                        }
                    );

                }

            }
        );


        // ========================================================
        // Exact duplicates
        // ========================================================

        classMap.forEach(
            (entries, key) => {

                if (entries.length > 1) {

                    exactDuplicates.push({

                        key: key,

                        entries: entries

                    });


                    entries.forEach(
                        (course) => {

                            course.row.classList.remove(
                                "duplicate-course"
                            );


                            course.row.classList.add(
                                "duplicate-exact"
                            );

                        }
                    );

                }

            }
        );


        const result = {

            totalCourses: courses.length,

            uniqueCourses: codeMap.size,

            duplicateCodes: duplicateCodes,

            exactDuplicates: exactDuplicates

        };


        console.log(
            "Duplicate scan result:",
            result
        );


        return result;

    }


    // ============================================================
    // Popup communication
    // ============================================================

    chrome.runtime.onMessage.addListener(
        function (message, sender, sendResponse) {

            console.log(
                "Message received:",
                message
            );


            if (
                message &&
                message.action === "scan"
            ) {

                try {

                    const result =
                        findDuplicates();


                    sendResponse(result);

                }
                catch (error) {

                    console.error(
                        "Scan error:",
                        error
                    );


                    sendResponse({

                        totalCourses: 0,

                        uniqueCourses: 0,

                        duplicateCodes: [],

                        exactDuplicates: [],

                        error: error.message

                    });

                }

            }


            return true;

        }
    );


    // ============================================================
    // Automatically scan
    // ============================================================

    function runScan() {

        setTimeout(
            function () {

                findDuplicates();

            },
            500
        );

    }


    // Page loaded normally

    if (
        document.readyState ===
        "loading"
    ) {

        document.addEventListener(
            "DOMContentLoaded",
            runScan
        );

    }
    else {

        runScan();

    }


    // ============================================================
    // Detect dynamically loaded table
    // ============================================================

    let scanTimer = null;


    const observer =
        new MutationObserver(
            function () {

                clearTimeout(scanTimer);


                scanTimer =
                    setTimeout(
                        function () {

                            const courses =
                                findCourses();


                            if (
                                courses.length > 0
                            ) {

                                findDuplicates();

                            }

                        },
                        500
                    );

            }
        );


    observer.observe(
        document.body,
        {
            childList: true,
            subtree: true
        }
    );


    // ============================================================
    // Global API
    // ============================================================

    window.courseDuplicateFinder = {

        scan: findDuplicates,

        getCourses: findCourses

    };


})();
