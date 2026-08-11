(function () {

    "use strict";

    // ============================================================
    // Extract course information from the enrollment table
    // ============================================================

    function findCourses() {

        const rows = document.querySelectorAll("tbody tr");

        const courses = [];

        rows.forEach((row) => {

            const cells = row.querySelectorAll("td");

            // Ignore rows that don't contain enough cells
            if (cells.length < 2) {
                return;
            }

            // ----------------------------------------------------
            // Course Code
            // Example:
            // AA 099
            // AA 150
            // CSE 111
            // ENG 101
            // ----------------------------------------------------

            const courseCode = cells[0].innerText.trim();

            if (!courseCode) {
                return;
            }

            // Ignore GPA / Total Credit Hours rows
            if (
                courseCode.toLowerCase() === "gpa" ||
                courseCode.toLowerCase().includes("total")
            ) {
                return;
            }

            // Check whether this looks like a course code
            if (!/^[A-Z]{2,5}\s*\d{3}$/i.test(courseCode)) {
                return;
            }


            // ----------------------------------------------------
            // Course Name
            // ----------------------------------------------------

            const courseName =
                cells[1].innerText
                    .split("(")[0]
                    .trim();


            // ----------------------------------------------------
            // Class information
            // ----------------------------------------------------

            const classLink = cells[1].querySelector("a");

            let classId = "";
            let className = "";

            if (classLink) {

                className = classLink.innerText.trim();

                const url = classLink.getAttribute("href");

                if (url) {

                    const match =
                        url.match(/classid=(\d+)/);

                    if (match) {
                        classId = match[1];
                    }
                }
            }


            // ----------------------------------------------------
            // Grade
            // ----------------------------------------------------

            let grade = "";

            if (cells.length >= 6) {

                grade = cells[4].innerText.trim();

            }


            // ----------------------------------------------------
            // Store course
            // ----------------------------------------------------

            courses.push({

                code: courseCode,

                name: courseName,

                classId: classId,

                className: className,

                grade: grade,

                row: row

            });

        });


        return courses;
    }


    // ============================================================
    // Remove previous highlighting
    // ============================================================

    function clearHighlighting() {

        const rows =
            document.querySelectorAll(
                ".duplicate-course, .duplicate-exact"
            );

        rows.forEach((row) => {

            row.classList.remove(
                "duplicate-course",
                "duplicate-exact"
            );

        });

    }


    // ============================================================
    // Find duplicate courses
    // ============================================================

    function findDuplicates() {

        const courses = findCourses();

        const codeMap = {};

        const classMap = {};


        // --------------------------------------------------------
        // Build maps
        // --------------------------------------------------------

        courses.forEach((course) => {

            // --------------------------------------------
            // Course-code map
            // --------------------------------------------

            if (!codeMap[course.code]) {

                codeMap[course.code] = [];

            }

            codeMap[course.code].push(course);


            // --------------------------------------------
            // Course + Class ID map
            // --------------------------------------------

            const classKey =
                course.code + "|" + course.classId;


            if (!classMap[classKey]) {

                classMap[classKey] = [];

            }

            classMap[classKey].push(course);

        });


        // Remove previous highlighting

        clearHighlighting();


        const duplicateCodes = [];

        const exactDuplicates = [];


        // ========================================================
        // Duplicate course codes
        // ========================================================

        Object.keys(codeMap).forEach((code) => {

            const entries = codeMap[code];

            if (entries.length > 1) {

                duplicateCodes.push({

                    code: code,

                    entries: entries

                });


                // Highlight all duplicate course rows

                entries.forEach((course) => {

                    course.row.classList.add(
                        "duplicate-course"
                    );

                });

            }

        });


        // ========================================================
        // Exact duplicate
        //
        // Same course code + same class ID
        // ========================================================

        Object.keys(classMap).forEach((key) => {

            const entries = classMap[key];

            if (entries.length > 1) {

                exactDuplicates.push({

                    key: key,

                    entries: entries

                });


                entries.forEach((course) => {

                    course.row.classList.add(
                        "duplicate-exact"
                    );

                });

            }

        });


        // ========================================================
        // Return result
        // ========================================================

        return {

            totalCourses: courses.length,

            uniqueCourses:
                Object.keys(codeMap).length,

            duplicateCodes: duplicateCodes,

            exactDuplicates: exactDuplicates

        };

    }


    // ============================================================
    // Expose scanner globally
    // ============================================================

    window.courseDuplicateFinder = {

        scan: findDuplicates,

        getCourses: findCourses

    };


    // ============================================================
    // Listen for popup request
    // ============================================================

    chrome.runtime.onMessage.addListener(

        (message, sender, sendResponse) => {

            if (message.action === "scan") {

                try {

                    const result =
                        findDuplicates();

                    sendResponse(result);

                } catch (error) {

                    console.error(
                        "Course Duplicate Finder Error:",
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

                return true;
            }

        }

    );


    // ============================================================
    // Automatically scan when page loads
    // ============================================================

    function initialScan() {

        try {

            findDuplicates();

            console.log(
                "Course Duplicate Finder: Enrollment scanned."
            );

        } catch (error) {

            console.error(
                "Course Duplicate Finder:",
                error
            );

        }

    }


    // Wait until page is fully loaded

    if (document.readyState === "loading") {

        document.addEventListener(
            "DOMContentLoaded",
            initialScan
        );

    } else {

        initialScan();

    }


})();