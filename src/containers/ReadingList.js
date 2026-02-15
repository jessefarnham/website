import React from 'react'
import "./ReadingList.css"
import { getLastModified } from '../lastModified';

export default function Home() {
    return (
        <div className="ReadingList">
            <div className="lander">
                <h4>Engineering Reading List</h4>

                <p>
                    Here is a list of books that I have found helpful to my development as a
                    software engineer. This was originally developed for new hires and other
                    junior engineers at my job.
                </p>

                <h5>Academic Textbooks</h5>
                <ul>
                    <li>
                        <strong>Computer architecture:</strong>{" "}
                        <a href="https://a.co/d/97CRu7y" target="_blank">
                            Structured Computer Organization
                        </a>{" "}
                        by Tanenbaum.
                        the logic gates all the way up to high-level programming languages.
                    </li>
                    <li>
                        <strong>Operating systems:</strong>{" "}
                        <a href="https://a.co/d/f53CELx" target="_blank">
                            Modern Operating Systems
                        </a>{" "}
                        by Tanenbaum.
                        computer architecture book. I would try reading the above book first
                        and see if you like the author’s bottom-up style. If you do, and you
                        want more detail on the operating system level, check this book out.
                    </li>
                    <li>
                        <strong>Networking:</strong>{" "}
                        <a href="https://a.co/d/0UzLFNl" target="_blank">
                            Computer Networks
                        </a>{" "}
                        by Tanenbaum and Wetherall.
                        greatly improved my understanding of API design. Some people don’t
                        like Tanenbaum's bottom-up approach, so you may prefer a different
                        author.
                    </li>
                    <li>
                        <strong>Other important subjects</strong> (I do not yet have book
                        recommendations because I have not yet studied these areas):
                        functional programming, programming languages, compilers.
                    </li>
                    <li>
                        I do not recommend Tanenbaum’s distributed systems book. I will
                        update this list when I find a better reference for this important
                        area.
                    </li>
                </ul>

                <h5>Books on Professional Software Engineering</h5>
                <ul>
                    <li>
                        <a href="https://a.co/d/9US18Li" target="_blank">
                            <strong>Code Complete</strong>
                        </a>{" "}
                        by McConnell.
                        engineering practices. Even if you don’t read all (or any) of this
                        book, you can use the bibliography of each chapter as a way to find
                        many more books that focus on software engineering in a real-world
                        corporate environment.
                    </li>
                    <li>
                        <a href="https://a.co/d/dBX8T67" target="_blank">
                            <strong>Software Requirements</strong>
                        </a>{" "}
                        by Beatty and Wiegers.
                        senior engineer/tech lead stage of their careers. It turns out that
                        the hardest part of professional software engineering is often
                        figuring out what needs to be done.
                    </li>
                </ul>

                <h5>Books That I Plan to Read</h5>
                <ul>
                    <li>
                        <a href="https://a.co/d/8Wxs5hf" target="_blank">
                            <strong>The Pragmatic Programmer</strong>
                        </a>{" "}
                        by Thomas and Hunt
                    </li>
                    <li>
                        <a href="https://a.co/d/45zOwcp" target="_blank">
                            <strong>Programming Pearls</strong>
                        </a>{" "}
                        by John Bentley
                    </li>
                    <li>
                        <a href="https://a.co/d/9JRrUt5" target="_blank">
                            <strong>Pattern-Oriented Software Architecture</strong>
                        </a>{" "}
                        series
                    </li>
                    <li>
                        <a href="https://a.co/d/6CBNDhZ" target="_blank">
                            <strong>The Art of Computer Programming</strong>
                        </a>{" "}
                        series by Donald Knuth
                    </li>
                </ul>

                <h5>Essential Book</h5>
                <p>
                    And finally, I think every developer should have this book on their
                    shelf and be generally familiar with its contents. If you took an
                    algorithms class in college, you will already be familiar with a lot
                    of this.
                </p>
                <p>
                    <a href="https://a.co/d/8we0rAt" target="_blank">
                        <strong>Introduction to Algorithms</strong>
                    </a>{" "}
                    by Cormen, Leiserson, Rivest, and Stein.
                    "CLRS" in the academic CS community.
                </p>
                <hr/>
                <footer>
                This page was last modified on {getLastModified('ReadingList')}.
                </footer>
            </div>
        </div>
    )
}
