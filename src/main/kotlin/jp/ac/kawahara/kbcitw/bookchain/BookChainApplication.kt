package jp.ac.kawahara.kbcitw.bookchain

import org.springframework.boot.SpringApplication
import org.springframework.boot.autoconfigure.SpringBootApplication

@SpringBootApplication
open class BookChainApplication

fun main(args: Array<String>) {
    SpringApplication.run(BookChainApplication::class.java, *args)
}
