package jp.ac.kawahara.itw.bookchain

import org.springframework.boot.SpringApplication
import org.springframework.boot.autoconfigure.SpringBootApplication

@SpringBootApplication
class BookChainApplication

fun main(args: Array<String>) {
    SpringApplication.run(BookChainApplication::class.java, *args)
}
