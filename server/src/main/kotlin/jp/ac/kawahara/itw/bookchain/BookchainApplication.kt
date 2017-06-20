package jp.ac.kawahara.itw.bookchain

import org.springframework.boot.SpringApplication
import org.springframework.boot.autoconfigure.SpringBootApplication

@SpringBootApplication
class BookchainApplication

fun main(args: Array<String>) {
    SpringApplication.run(BookchainApplication::class.java, *args)
}
